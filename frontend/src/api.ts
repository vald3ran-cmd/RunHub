import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const setAuthToken = async (token: string | null) => {
  if (token) await AsyncStorage.setItem('auth_token', token);
  else await AsyncStorage.removeItem('auth_token');
};

export const getAuthToken = async () => AsyncStorage.getItem('auth_token');
