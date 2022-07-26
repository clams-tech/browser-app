import bitcoin from './icons/bitcoin'
import lightning from './icons/lightning'
import { BitcoinDenomination, FiatDenomination, Language, type Settings } from './types'

export const DEV = import.meta.env.DEV
export const MODE = import.meta.env.MODE

export const WS_PROXY = 'wss://wsproxy.clams.tech'
export const LNURL_PROXY = 'https://wsproxy.clams.tech/proxy'

export const COIN_GECKO_PRICE_ENDPOINT = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${Object.keys(
  FiatDenomination
).join(',')}`

export const COINBASE_PRICE_ENDPOINT = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC'

export const SEC_IN_MS = 1000
export const MIN_IN_MS = 60 * 1000
export const MIN_IN_SECS = 60

export const DEFAULT_INVOICE_EXPIRY = 60 * MIN_IN_SECS

export const DEFAULT_SETTINGS: Settings = {
  language: (typeof window === 'undefined'
    ? Language['en-US']
    : navigator?.languages
    ? navigator.languages[0]
    : navigator.language) as Language,
  fiatDenomination: FiatDenomination.usd,
  bitcoinDenomination: BitcoinDenomination.sats,
  primaryDenomination: BitcoinDenomination.sats,
  secondaryDenomination: FiatDenomination.usd,
  invoiceExpiry: DEFAULT_INVOICE_EXPIRY,
  sendMaxFeePercent: 0.5,
  sendTimeoutSeconds: 120,
  notifications: true,
  darkmode: false,
  encrypt: false
}

export const SUPPORTED_LOCALES = ['en-US', 'en-GB']
export const SETTINGS_STORAGE_KEY = 'clams-app:settings'
export const AUTH_STORAGE_KEY = 'clams-app:auth'
export const PAYMENTS_STORAGE_KEY = 'clams-app:payments'
export const FUNDS_STORAGE_KEY = 'clams-app:funds'
export const INFO_STORAGE_KEY = 'clams-app:info'
export const LISTEN_INVOICE_STORAGE_KEY = 'clams-app:listening'

export const ENCRYPTED_DATA_KEYS = [
  AUTH_STORAGE_KEY,
  PAYMENTS_STORAGE_KEY,
  FUNDS_STORAGE_KEY,
  INFO_STORAGE_KEY
]
export const ALL_DATA_KEYS = ENCRYPTED_DATA_KEYS.concat(
  SETTINGS_STORAGE_KEY,
  LISTEN_INVOICE_STORAGE_KEY
)

export const DOCS_LINK = 'https://docs.clams.tech'
export const DOCS_CONNECT_LINK = 'https://docs.clams.tech/connection'
export const DOCS_RUNE_LINK = 'https://docs.clams.tech/authentication'
export const TWITTER_LINK = 'https://twitter.com/clamstech'
export const GITHUB_LINK = 'https://github.com/clams-tech'
export const DISCORD_LINK = 'https://discord.gg/eWfHuJZVaB'
export const TRANSLATE_LINK = 'https://github.com/clams-tech/browser-app#contributing'

export const currencySymbols = {
  btc: bitcoin,
  sats: lightning,
  msats: lightning,
  usd: '$',
  eur: '€',
  gbp: '£',
  cny: '¥',
  jpy: '¥',
  cad: '$',
  aud: '$',
  hkd: '$',
  sgd: 'S$',
  sek: 'kr',
  chf: 'CHF',
  thb: '฿',
  pln: 'zł',
  nok: 'kr',
  myr: 'RM',
  dkk: 'kr',
  zar: 'R',
  nzd: '$',
  mxn: '$',
  rub: '₽'
}
