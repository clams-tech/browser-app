import type { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  use: {
    // @TODO
    // httpCredentials: {
    //   username: 'satoshi',
    //   password: 'nakamoto'
    // },
    ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:4173'
  },
  webServer: {
    command: 'yarn build && yarn preview',
    port: 4173
  }
}

export default config
