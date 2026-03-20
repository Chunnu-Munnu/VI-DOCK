export const config = {
    API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    ENDPOINTS: {
        PROJECTS: '/projects',
        DOCKING: '/docking',
        ANALYSIS: '/analysis',
        SYSTEM: '/system',
        FETCH: '/fetch',
        CONVERT: '/convert'
    }
};
