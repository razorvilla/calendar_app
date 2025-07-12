import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/graphql'; // GraphQL API Gateway endpoint

interface GraphQLResponse<T> {
  data: T;
  errors?: any[];
}

interface AuthPayload {
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  requiresMfa?: boolean;
  userId?: string;
}

export const login = async (credentials: any): Promise<AuthPayload> => {
  const mutation = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        user {
          id
          email
          name
        }
        requiresMfa
        userId
      }
    }
  `;
  const variables = { input: credentials };
  const response = await axios.post<GraphQLResponse<{ login: AuthPayload }>>(API_BASE_URL, { query: mutation, variables });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Login failed');
  }
  return response.data.data.login;
};

export const register = async (userData: any): Promise<AuthPayload> => {
  const mutation = `
    mutation Register($input: RegisterInput!) {
      register(input: $input) {
        accessToken
        user {
          id
          email
          name
        }
      }
    }
  `;
  const variables = { input: userData };
  const response = await axios.post<GraphQLResponse<{ register: AuthPayload }>>(API_BASE_URL, { query: mutation, variables });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Registration failed');
  }
  return response.data.data.register;
};

export const refreshToken = async (): Promise<string> => {
  const mutation = `
    mutation RefreshToken {
      refreshToken {
        accessToken
      }
    }
  `;
  const response = await axios.post<GraphQLResponse<{ refreshToken: { accessToken: string } }>>(API_BASE_URL, { query: mutation });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Token refresh failed');
  }
  return response.data.data.refreshToken.accessToken;
};

export const logout = async (): Promise<any> => {
  const mutation = `
    mutation Logout {
      logout
    }
  `;
  const response = await axios.post<GraphQLResponse<{ logout: boolean }>>(API_BASE_URL, { query: mutation });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message || 'Logout failed');
  }
  return response.data.data.logout;
};
