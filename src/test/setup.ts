import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

process.env.SD_DB_PATH ??= ':memory:';
