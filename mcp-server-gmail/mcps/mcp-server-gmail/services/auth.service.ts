import axios from "npm:axios@1.12.2";
import { AuthTokenValidateRequest, AuthTokenRequest, AuthTokenResponse } from "../types/email.ts";

export class AuthService {
    private authServerUrl: string;

    constructor(authServerUrl: string) {
        this.authServerUrl = authServerUrl;
    }

    async getValidToken(userId: string): Promise<AuthTokenResponse> {
        try {
            const request: AuthTokenValidateRequest = {
                userId,
            };

            const { data } = await axios.post(`${this.authServerUrl}/api/v1/auth-apps/validate`, request, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log("====== VALIDATE ENDPOINT");
            console.log(JSON.stringify(data, null, 2));

            if (data.status === "success") {
                return {
                    valid: true,
                    accessToken: data.data.accessToken
                };
            } else {
                return {
                    valid: false,
                    error: data.message || 'Token validation failed'
                };
            }
        } catch (error: any) {
            console.error('====== ERROR');
            console.log(error.message);
            console.log(error.name);
            console.log(error.code);
            console.log(error.response?.status);
            console.log(error.response?.data);

            return {
                valid: false,
                error: error.response?.data?.message || error.message || 'Authentication service unavailable'
            };
        }
    }

    async requestAuthorization(userId: string, authConfigId: string): Promise<{ authUrl?: string; error?: string }> {
        try {
            const request: AuthTokenRequest = {
                authConfigId,
                userId,
                toolkit: "gmail",
            };

            const { data } = await axios.post(`${this.authServerUrl}/api/v1/auth-apps/request`, request, {
                headers: {
                'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log("====== REQUEST AUTHORIZATION");
            console.log(JSON.stringify(data, null, 2));

            if (data.status === "success") {
                return {
                    authUrl: data.data.authUrl
                };
            } else {
                return {
                    error: data.message || 'Failed to generate authorization URL'
                };
            }
        } catch (error: any) {
            console.error('====== ERROR');
            console.log(error.message);
            console.log(error.name);
            console.log(error.code);
            console.log(error.response?.status);
            console.log(error.response?.data);

            return {
                error: error.response?.data?.message || error.message || 'Authorization service unavailable'
            };
        }
    }
}
