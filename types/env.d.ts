declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_PYTHON_API_URL: string;
    NEXT_PUBLIC_APP_ENV: 'development' | 'production';
  }
}
