import { beforeAll, afterEach, afterAll } from 'vitest'

beforeAll(() => {
  // MSW will intercept all fetch requests
  console.log('MSW setup initialized')
})

afterEach(() => {
  // Clean up after each test
})

afterAll(() => {
  // Clean up
})