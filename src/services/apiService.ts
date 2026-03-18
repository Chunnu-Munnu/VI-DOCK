import { config } from '../config';
// Types removed - not used in this file

export interface JobStatus {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
    result?: {
        output_file: string;
        scores: Array<{
            Mode: number;
            'Affinity (kcal/mol)': number;
            'RMSD L.B.': number;
            'RMSD U.B.': number;
        }>;
    };
}

export const apiService = {
    async createProject(name: string) {
        const response = await fetch(`${config.API_BASE_URL}/projects/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to create project');
        return response.json();
    },

    async uploadFile(projectName: string, file: File, category: 'receptor' | 'ligand') {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${config.API_BASE_URL}/projects/${projectName}/upload?category=${category}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Failed to upload ${category}`);
        return response.json();
    },

    async submitJob(projectName: string, configData: {
        engine: 'vina' | 'smina'; // Restricted as requested
        receptor_file: string;
        ligand_file: string;
        config: {
            center_x: number; center_y: number; center_z: number;
            size_x: number; size_y: number; size_z: number;
        };
        exhaustiveness: number;
    }) {
        const response = await fetch(`${config.API_BASE_URL}/docking/${projectName}/dock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Job submission failed');
        }
        return response.json();
    },

    async getJobStatus(jobId: string): Promise<JobStatus> {
        const response = await fetch(`${config.API_BASE_URL}/docking/jobs/${jobId}`);
        if (!response.ok) throw new Error('Failed to check job status');
        return response.json();
    },

    getDownloadUrl(relativePath: string) {
        const key = 'VI DOCK_Projects';
        if (relativePath.includes(key)) {
            const part = relativePath.split(key)[1];
            const cleanPart = part.replace(/\\/g, '/');
            return `${config.API_BASE_URL}/files${cleanPart}`;
        }
        return relativePath;
    },

    /**
     * Convert PDB to PDBQT using OpenBabel on the backend.
     */
    async convertPdbToPdbqt(pdbContent: string, addHydrogens: boolean = true): Promise<string> {
        const response = await fetch(`${config.API_BASE_URL}/convert/pdb-to-pdbqt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdb_content: pdbContent,
                add_hydrogens: addHydrogens
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'PDB to PDBQT conversion failed');
        }

        const result = await response.json();
        return result.pdbqt_content;
    },

    /**
     * Convert SDF/MOL to PDBQT using OpenBabel on the backend.
     */
    async convertSdfToPdbqt(sdfContent: string, addHydrogens: boolean = true): Promise<string> {
        const response = await fetch(`${config.API_BASE_URL}/convert/sdf-to-pdbqt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sdf_content: sdfContent,
                add_hydrogens: addHydrogens
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'SDF to PDBQT conversion failed');
        }

        const result = await response.json();
        return result.pdbqt_content;
    },

    /**
     * Convert SMILES to 3D PDBQT using OpenBabel on the backend.
     */
    async convertSmilesToPdbqt(smiles: string, name: string = 'ligand'): Promise<string> {
        const response = await fetch(`${config.API_BASE_URL}/convert/smiles-to-pdbqt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles, name })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'SMILES to PDBQT conversion failed');
        }

        const result = await response.json();
        return result.pdbqt_content;
    },

    /**
     * Fetch PDB from RCSB via backend.
     */
    async fetchPdb(pdbId: string): Promise<{ pdb_content: string; title: string }> {
        const response = await fetch(`${config.API_BASE_URL}/fetch/pdb/${pdbId}`);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Failed to fetch PDB ${pdbId}`);
        }

        return response.json();
    },

    /**
     * Fetch compound from PubChem via backend.
     * Returns both SDF and PDBQT (if conversion succeeded).
     */
    async fetchPubChem(query: string): Promise<{ sdf_content: string; pdbqt_content: string; name: string }> {
        const response = await fetch(`${config.API_BASE_URL}/fetch/pubchem/${encodeURIComponent(query)}?convert_to_pdbqt=true`);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Failed to fetch compound ${query}`);
        }

        return response.json();
    }
};
