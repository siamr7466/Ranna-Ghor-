import axios from 'axios';

// Use relative path for Vercel (proxies to backend)
// Or use absolute URL if configured differently
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
