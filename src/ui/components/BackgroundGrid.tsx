import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useDockingStore } from '../../store/dockingStore';

const BackgroundGrid = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const theme = useDockingStore(state => state.theme);

    useEffect(() => {
        if (!mountRef.current) return;

        // 1. Scene Setup
        const scene = new THREE.Scene();

        // --- THEME COLORS ---
        const isLight = theme === 'light';
        // Sharp Black or White Background
        const bgHex = isLight ? 0xffffff : 0x000000;

        scene.background = new THREE.Color(bgHex);
        // Minimal fog for depth, but keep it clean
        scene.fog = new THREE.FogExp2(bgHex, 0.015);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(renderer.domElement);

        // --- GRID CONFIG ---
        // High contrast grid lines
        const isDark = theme === 'dark';
        const gridColorMain = isDark ? 0x444444 : 0xcccccc;
        const gridColorSub = isDark ? 0x222222 : 0xeeeeee;
        const centerColor = isDark ? 0x666666 : 0xaaaaaa;

        // Main Grid (10x10 blocks)
        const mainGrid = new THREE.GridHelper(100, 10, centerColor, gridColorMain);
        (mainGrid.material as THREE.Material).transparent = true;
        (mainGrid.material as THREE.Material).opacity = 0.4;
        scene.add(mainGrid);

        // Sub Grid (100x100 blocks)
        const subGrid = new THREE.GridHelper(100, 100, centerColor, gridColorSub);
        (subGrid.material as THREE.Material).transparent = true;
        (subGrid.material as THREE.Material).opacity = 0.15;
        scene.add(subGrid);

        // Glassy grey base plane
        const planeGeo = new THREE.PlaneGeometry(100, 100);
        const planeMat = new THREE.MeshBasicMaterial({
            color: isDark ? 0x111111 : 0xffffff,
            transparent: true,
            opacity: 0.25, // Glassy grey opaqueness
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.01; // slightly below grids
        scene.add(plane);

        const animate = () => {
            requestAnimationFrame(animate);
            // Static grid, no movement
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountRef.current) mountRef.current.innerHTML = '';
            renderer.dispose();
        };
    }, [theme]);

    return (
        <div
            ref={mountRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                pointerEvents: 'none'
            }}
        />
    );
};

export default BackgroundGrid;
