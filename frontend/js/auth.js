// Authentication Manager for UniRide (Auto-Login & Token Storage)

const AuthManager = {
    tokenKey: 'uniride_jwt_token',
    userKey: 'uniride_user_profile',

    getToken() {
        return localStorage.getItem(this.tokenKey);
    },

    getUser() {
        const u = localStorage.getItem(this.userKey);
        return u ? JSON.parse(u) : null;
    },

    setSession(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    },

    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        sessionStorage.removeItem('uniride_session_role');
    },

    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    },

    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    async checkAutoLogin() {
        if (!this.isLoggedIn()) return null;

        try {
            // Verify token with backend /api/auth/me
            const resp = await fetch('/api/auth/me', { headers: this.getAuthHeader() });
            if (resp.ok) {
                const user = await resp.json();
                localStorage.setItem(this.userKey, JSON.stringify(user));
                return user;
            } else {
                // Token expired or invalid
                this.clearSession();
                return null;
            }
        } catch (err) {
            console.error("Auto-login check failed:", err);
            // Fallback to local stored user if offline
            return this.getUser();
        }
    },

    async login(studentIdOrEmail, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id_or_email: studentIdOrEmail,
                password: password
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        this.setSession(data.access_token, data.user);
        return data.user;
    },

    async signup(userData) {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Signup failed');
        }

        this.setSession(data.access_token, data.user);
        return data.user;
    },

    logout() {
        this.clearSession();
        window.location.reload();
    }
};
