"""
Conversion Routes - PDB to PDBQT using OpenBabel
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import tempfile
import os
import subprocess

import shutil

import sys

# Try imports
try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    from meeko import MoleculePreparation
    RDKIT_AVAILABLE = True
except ImportError:
    RDKIT_AVAILABLE = False

from utils.config import OBABEL_PATH

router = APIRouter()

def get_obabel_cmd():
    """Get the OpenBabel command/path, checking config and system path."""
    # 1. Check configured path
    if OBABEL_PATH and os.path.exists(OBABEL_PATH):
        return OBABEL_PATH
    
    # 2. Check system path
    if shutil.which("obabel"):
        return "obabel"
        
    # 3. Check common Windows locations as fallbacks
    common_paths = [
        r"C:\Program Files\OpenBabel-2.4.1\obabel.exe",
        r"C:\Program Files (x86)\OpenBabel-2.4.1\obabel.exe",
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path
            
    return None

def convert_with_rdkit(content: str, input_format: str, add_h: bool = True) -> str:
    """
    Convert using RDKit + Meeko (Pure Python).
    Handles PDB, SDF, SMILES.
    Returns PDBQT string.
    """
    if not RDKIT_AVAILABLE:
        raise HTTPException(500, "OpenBabel not found AND RDKit/Meeko not installed. Please install 'rdkit' and 'meeko' via pip.")

    try:
        mol = None
        if input_format == 'pdb':
            mol = Chem.MolFromPDBBlock(content, removeHs=False)
            if mol:
                if add_h:
                    mol = Chem.AddHs(mol, addCoords=True)
                
                # Attempt 1: Use Meeko (Preferred for Ligands/Flexible)
                # This fails for large proteins/receptors with multiple fragments
                try:
                    # Try to calculate Gasteiger charges first
                    try: AllChem.ComputeGasteigerCharges(mol)
                    except: pass

                    preparator = MoleculePreparation()
                    preparator.prepare(mol)
                    return preparator.write_pdbqt_string()
                except Exception as meeko_error:
                    # Attempt 2: Fallback to Manual Rigid PDBQT (For Receptors/Proteins)
                    # print(f"Meeko failed ({meeko_error}), falling back to rigid writer")
                    
                    # Manual PDBQT Write for Rigid Receptor
                    pdbqt_lines = []
                    conf = mol.GetConformer()
                    
                    atom_map = {
                        6: "C", 7: "N", 8: "O", 16: "S", 1: "H", 
                        9: "F", 17: "Cl", 35: "Br", 53: "I", 15: "P"
                    }
                    
                    for i, atom in enumerate(mol.GetAtoms()):
                        pos = conf.GetAtomPosition(i)
                        atomic_num = atom.GetAtomicNum()
                        symbol = atom.GetSymbol()
                        
                        # Basic Autodock Type mapping
                        ad_type = symbol
                        if atom.GetIsAromatic() and symbol == 'C':
                            ad_type = 'A'
                        if symbol == 'N' and atom.GetIsAromatic(): # Simplified
                            ad_type = 'N'
                        
                        # Charge
                        charge = 0.0
                        if atom.HasProp('_GasteigerCharge'):
                            try:
                                charge = float(atom.GetProp('_GasteigerCharge'))
                            except: pass
                        
                        # Formatted PDBQT line
                        # ATOM      1  N   ASP A   1      46.126  29.704  16.828  0.00  0.00    -0.456 NA 
                        # We use a simplified formatter
                        res_name = (atom.GetPDBResidueInfo().GetResidueName() if atom.GetPDBResidueInfo() else "UNK")[:3]
                        chain = (atom.GetPDBResidueInfo().GetChainId() if atom.GetPDBResidueInfo() else "A")[:1]
                        res_num = (atom.GetPDBResidueInfo().GetResidueNumber() if atom.GetPDBResidueInfo() else 1)
                        atom_name = (atom.GetPDBResidueInfo().GetName().strip() if atom.GetPDBResidueInfo() else symbol)[:4]
                        
                        line = f"ATOM  {i+1:>5} {atom_name:^4} {res_name:>3} {chain:>1}{res_num:>4}    {pos.x:>8.3f}{pos.y:>8.3f}{pos.z:>8.3f}  1.00  0.00    {charge:>6.3f} {ad_type:<2}"
                        pdbqt_lines.append(line)
                        
                    return "\n".join(pdbqt_lines)

        elif input_format == 'sdf':
            mol = Chem.MolFromMolBlock(content, removeHs=False)
        elif input_format == 'smiles':
            mol = Chem.MolFromSmiles(content)
            if mol:
                mol = Chem.AddHs(mol)
                AllChem.EmbedMolecule(mol) # Generate 3D
        
        if mol is None:
            raise ValueError("Could not parse molecule")

        if add_h:
            mol = Chem.AddHs(mol, addCoords=True)
            
        # Standardize/Prep
        # Meeko handles charge calculation automatically during prep if not present
        # But explicitly computing them is safer
        # AllChem.ComputeGasteigerCharges(mol) # Meeko computes charges internally if needed
        
        # Use Meeko for PDBQT generation
        # Meeko handles the PDBQT formatting including branching/torsions
        preparator = MoleculePreparation()
        preparator.prepare(mol)
        pdbqt_string = preparator.write_pdbqt_string()
        
        return pdbqt_string
        
    except Exception as e:
        raise HTTPException(500, f"RDKit conversion failed: {str(e)}")

class ConversionRequest(BaseModel):
    pdb_content: str
    add_hydrogens: bool = True
    
class ConversionResponse(BaseModel):
    pdbqt_content: str
    success: bool
    message: str

@router.post("/pdb-to-pdbqt", response_model=ConversionResponse)
async def convert_pdb_to_pdbqt(request: ConversionRequest):
    """
    Convert PDB content to PDBQT format using OpenBabel.
    
    This performs proper:
    - Gasteiger partial charge calculation
    - AutoDock atom type assignment
    - Hydrogen addition (optional)
    """
    """
    """
    message = ""
    obabel_cmd = get_obabel_cmd()
    
    # Fallback to RDKit if OpenBabel is missing
    if not obabel_cmd:
        if RDKIT_AVAILABLE:
            pdbqt = convert_with_rdkit(request.pdb_content, 'pdb', request.add_hydrogens)
            return ConversionResponse(
                pdbqt_content=pdbqt,
                success=True,
                message=f"Converted PDB to PDBQT using RDKit (OpenBabel not found)"
            )
        else:
             raise HTTPException(
                status_code=500, 
                detail=f"OpenBabel not found AND RDKit/Meeko fallback unavailable."
            )
    
    try:
        # Create temp files
        with tempfile.TemporaryDirectory() as temp_dir:
            input_pdb = os.path.join(temp_dir, "input.pdb")
            output_pdbqt = os.path.join(temp_dir, "output.pdbqt")
            
            # Write input PDB
            with open(input_pdb, 'w') as f:
                f.write(request.pdb_content)
            
            # Build OpenBabel command
            # -ipdb: input format PDB
            # -opdbqt: output format PDBQT
            # -xr: receptor mode (no torsions)
            # --partialcharge gasteiger: calculate Gasteiger charges
            cmd = [
                obabel_cmd,
                "-ipdb", input_pdb,
                "-opdbqt", "-O", output_pdbqt,
                "-xr",  # Receptor mode
                "--partialcharge", "gasteiger"
            ]
            
            # Add hydrogens if requested
            if request.add_hydrogens:
                cmd.insert(3, "-h")  # Add hydrogens
            
            # Run OpenBabel
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown OpenBabel error"
                raise HTTPException(
                    status_code=500,
                    detail=f"OpenBabel conversion failed: {error_msg}"
                )
            
            # Read output
            if not os.path.exists(output_pdbqt):
                raise HTTPException(
                    status_code=500,
                    detail="OpenBabel did not produce output file"
                )
            
            with open(output_pdbqt, 'r') as f:
                pdbqt_content = f.read()
            
            if not pdbqt_content.strip():
                raise HTTPException(
                    status_code=500,
                    detail="OpenBabel produced empty output"
                )
            
            return ConversionResponse(
                pdbqt_content=pdbqt_content,
                success=True,
                message=f"Successfully converted PDB to PDBQT ({len(pdbqt_content)} bytes)"
            )
            
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="OpenBabel conversion timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Conversion error: {str(e)}"
        )


class SdfConversionRequest(BaseModel):
    sdf_content: str
    add_hydrogens: bool = True

@router.post("/sdf-to-pdbqt", response_model=ConversionResponse)
async def convert_sdf_to_pdbqt(request: SdfConversionRequest):
    """
    Convert SDF/MOL content to PDBQT format using OpenBabel.
    Suitable for ligand preparation.
    """
    obabel_cmd = get_obabel_cmd()
    
    if not obabel_cmd:
        if RDKIT_AVAILABLE:
            pdbqt = convert_with_rdkit(request.sdf_content, 'sdf', request.add_hydrogens)
            return ConversionResponse(
                pdbqt_content=pdbqt,
                success=True,
                message=f"Converted SDF to PDBQT using RDKit (OpenBabel not found)"
            )
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"OpenBabel not found AND RDKit/Meeko fallback unavailable."
            )
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            input_sdf = os.path.join(temp_dir, "input.sdf")
            output_pdbqt = os.path.join(temp_dir, "output.pdbqt")
            
            with open(input_sdf, 'w') as f:
                f.write(request.sdf_content)
            
            # Ligand mode (no -xr flag)
            cmd = [
                obabel_cmd,
                "-isdf", input_sdf,
                "-opdbqt", "-O", output_pdbqt,
                "--partialcharge", "gasteiger"
            ]
            
            if request.add_hydrogens:
                cmd.insert(3, "-h")
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode != 0:
                raise HTTPException(status_code=500, detail=f"OpenBabel failed: {result.stderr}")
            
            if not os.path.exists(output_pdbqt):
                raise HTTPException(status_code=500, detail="OpenBabel did not produce output")
            
            with open(output_pdbqt, 'r') as f:
                pdbqt_content = f.read()
            
            return ConversionResponse(
                pdbqt_content=pdbqt_content,
                success=True,
                message=f"Converted SDF to PDBQT ({len(pdbqt_content)} bytes)"
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Conversion timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


class SmilesConversionRequest(BaseModel):
    smiles: str
    name: str = "ligand"

@router.post("/smiles-to-pdbqt", response_model=ConversionResponse)
async def convert_smiles_to_pdbqt(request: SmilesConversionRequest):
    """
    Convert SMILES string to 3D PDBQT using OpenBabel.
    Generates 3D coordinates and calculates charges.
    """
    obabel_cmd = get_obabel_cmd()
    
    if not obabel_cmd:
        if RDKIT_AVAILABLE:
            pdbqt = convert_with_rdkit(request.smiles, 'smiles', True)
            return ConversionResponse(
                pdbqt_content=pdbqt,
                success=True,
                message=f"Converted SMILES to PDBQT using RDKit (OpenBabel not found)"
            )
        else:
            raise HTTPException(status_code=500, detail="OpenBabel not found AND RDKit/Meeko unavailable.")
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            input_smi = os.path.join(temp_dir, "input.smi")
            output_pdbqt = os.path.join(temp_dir, "output.pdbqt")
            
            with open(input_smi, 'w') as f:
                f.write(f"{request.smiles} {request.name}")
            
            # Generate 3D with --gen3d
            cmd = [
                obabel_cmd,
                "-ismi", input_smi,
                "-opdbqt", "-O", output_pdbqt,
                "--gen3d",  # Generate 3D coordinates
                "-h",       # Add hydrogens
                "--partialcharge", "gasteiger"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode != 0:
                raise HTTPException(status_code=500, detail=f"OpenBabel failed: {result.stderr}")
            
            if not os.path.exists(output_pdbqt):
                raise HTTPException(status_code=500, detail="OpenBabel did not produce output")
            
            with open(output_pdbqt, 'r') as f:
                pdbqt_content = f.read()
            
            return ConversionResponse(
                pdbqt_content=pdbqt_content,
                success=True,
                message=f"Converted SMILES to 3D PDBQT ({len(pdbqt_content)} bytes)"
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Conversion timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")
