import CryptoJS from 'crypto-js'
import Big from 'big.js'
import UAParser from 'ua-parser-js'
import { formatDistanceToNowStrict, formatRelative, type Locale } from 'date-fns'
import type { ListfundsResponse } from './backends'
import { log$ } from './streams'

import {
  ALL_DATA_KEYS,
  COINBASE_PRICE_ENDPOINT,
  COIN_GECKO_PRICE_ENDPOINT,
  ENCRYPTED_DATA_KEYS
} from './constants'

import type {
  Denomination,
  PaymentType,
  Payment,
  BitcoinExchangeRates,
  FormattedSections,
  ParsedNodeAddress,
  Auth
} from './types'

export function formatDecodedInvoice(decodedInvoice: {
  paymentRequest: string
  sections: { name: string; value?: string | number }[]
}): {
  paymentRequest: string
  expiry: number
  description: string
  amount: string
  timestamp: number
} {
  const { sections, paymentRequest } = decodedInvoice

  const formattedSections = sections.reduce((acc, { name, value }) => {
    if (name && value) {
      acc[name] = value
    }

    return acc
  }, {} as FormattedSections)

  return { paymentRequest, ...formattedSections }
}

export function deriveLastPayIndex(payments: Payment[]): number {
  return payments.length
    ? payments.reduce((currentHighestIndex, { payIndex }) => {
        return payIndex && payIndex > currentHighestIndex ? payIndex : currentHighestIndex
      }, 0)
    : 0
}

export function truncateValue(request: string): string {
  return `${request.slice(0, 9)}...${request.slice(-9)}`
}

export function supportsNotifications(): boolean {
  return 'Notification' in window
}

export function notificationsPermissionsGranted(): boolean {
  return Notification.permission === 'granted'
}

export function formatValueForDisplay({
  value,
  denomination,
  commas = false,
  input = false
}: {
  value: string | null
  denomination: Denomination
  commas?: boolean
  input?: boolean
}): string {
  if (!value) return ''
  if (value === 'any') return '0'

  switch (denomination) {
    case 'btc': {
      const formatted = value === '0' ? value : Big(value).round(8).toString()
      return commas ? formatWithCommas(formatted) : formatted
    }

    case 'sats':
    case 'msats': {
      const formatted = Big(value).round().toString()
      return commas ? formatWithCommas(formatted) : formatted
    }

    // fiat
    default: {
      let formatted

      // if live input don't round or format just yet
      if (input) {
        formatted = value
      } else if (String(value).includes('.')) {
        const rounded = Big(value).round(2).toString()
        const decimalIndex = rounded.indexOf('.')
        formatted =
          decimalIndex >= 1 && decimalIndex === rounded.length - 2 ? `${rounded}0` : rounded
      } else {
        formatted = value
      }

      return commas ? formatWithCommas(formatted) : formatted
    }
  }
}

export function isFiatDenomination(denomination: Denomination): boolean {
  switch (denomination) {
    case 'btc':
    case 'sats':
    case 'msats':
      return false
    default:
      return true
  }
}

export function formatWithCommas(val: string, commasAfterDecimal?: boolean) {
  if (commasAfterDecimal) {
    return val.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const parts = val.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return parts.join('.')
}

export async function getClipboardPermissions(): Promise<boolean> {
  try {
    const name = 'clipboard-read' as PermissionName
    const { state } = await navigator.permissions.query({ name })

    return state === 'granted'
  } catch (error) {
    return false
  }
}

export async function readClipboardValue(): Promise<string | null> {
  try {
    const clipboardText = await navigator.clipboard.readText()
    return clipboardText || null
  } catch (error) {
    return null
  }
}

/**
 *
 * @returns boolean indicating if write was successful
 */
export async function writeClipboardValue(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    return false
  }
}

export const nodePublicKeyRegex = /[0-9a-fA-F]{66}/
export const lightningInvoiceRegex = /^(lnbcrt|lnbc)[a-zA-HJ-NP-Z0-9]{1,}$/
const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/

export function getPaymentType(value: string): PaymentType | null {
  if (nodePublicKeyRegex.test(value)) {
    return 'node_public_key'
  }

  if (lightningInvoiceRegex.test(value)) {
    return 'payment_request'
  }

  return null
}

export const encryptWithAES = (text: string, passphrase: string) => {
  return CryptoJS.AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase)
  const originalText = bytes.toString(CryptoJS.enc.Utf8)
  return originalText
}

export function getDataFromStorage(storageKey: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(storageKey)
}

// Svelte action to use when wanting to do something when there is a click outside of element
export function clickOutside(element: HTMLElement, callbackFunction: () => void) {
  function onClick(event: MouseEvent) {
    if (!element.contains(event.target as HTMLElement)) {
      callbackFunction()
    }
  }

  document.body.addEventListener('click', onClick)

  return {
    update(newCallbackFunction: () => void) {
      callbackFunction = newCallbackFunction
    },
    destroy() {
      document.body.removeEventListener('click', onClick)
    }
  }
}

// https://github.com/date-fns/date-fns/blob/9bb51691f201c3ec05ab832acbc5d478f2e5c47a/docs/i18nLocales.md
const locales: Record<string, () => Promise<Locale>> = {
  'en-GB': () => import('date-fns/esm/locale/en-GB/index.js').then((mod) => mod.default), // British English
  'en-US': () => import('date-fns/esm/locale/en-US/index.js').then((mod) => mod.default), // American English
  'zh-CN': () => import('date-fns/esm/locale/zh-CN/index.js').then((mod) => mod.default), // Chinese (mainland)
  es: () => import('date-fns/esm/locale/es/index.js').then((mod) => mod.default), // Spanish
  hi: () => import('date-fns/esm/locale/hi/index.js').then((mod) => mod.default), // Hindi
  ar: () => import('date-fns/esm/locale/ar/index.js').then((mod) => mod.default), // Arabic
  bn: () => import('date-fns/esm/locale/bn/index.js').then((mod) => mod.default), // Bengali
  fr: () => import('date-fns/esm/locale/fr/index.js').then((mod) => mod.default), // French
  pt: () => import('date-fns/esm/locale/pt/index.js').then((mod) => mod.default), // Portuguese
  ru: () => import('date-fns/esm/locale/ru/index.js').then((mod) => mod.default), // Russian
  ja: () => import('date-fns/esm/locale/ja/index.js').then((mod) => mod.default), // Japanese
  id: () => import('date-fns/esm/locale/id/index.js').then((mod) => mod.default), // Indonesian
  de: () => import('date-fns/esm/locale/de/index.js').then((mod) => mod.default), // German
  te: () => import('date-fns/esm/locale/te/index.js').then((mod) => mod.default), // Telugu
  tr: () => import('date-fns/esm/locale/tr/index.js').then((mod) => mod.default), // Turkish
  ta: () => import('date-fns/esm/locale/ta/index.js').then((mod) => mod.default), // Tamil
  ko: () => import('date-fns/esm/locale/ko/index.js').then((mod) => mod.default) // Korean
}

export async function formatDate(options: { date: string; language: string }): Promise<string> {
  const { date, language } = options
  const locale = await (locales[language] || locales['en-GB'])()

  return formatRelative(new Date(date), new Date(), { locale })
}

export async function formatCountdown(options: { date: Date; language: string }): Promise<string> {
  const { date, language } = options

  const locale = await (locales[language] || locales['en-GB'])()

  return formatDistanceToNowStrict(date, { locale, addSuffix: true })
}

export function formatDestination(destination: string, type: PaymentType): string {
  switch (type) {
    case 'payment_request':
    case 'node_public_key':
      return truncateValue(destination)
    default:
      return destination
  }
}

export const userAgent = typeof window !== 'undefined' ? new UAParser(navigator.userAgent) : null

// limited to offchain funds for the moment
export const calculateBalance = (funds: ListfundsResponse): string => {
  const offChain = funds.channels.reduce((total, channel) => {
    const { our_amount_msat } = channel

    if (!our_amount_msat) {
      logger.warn(JSON.stringify({ msg: 'no our_amount_msat value', channel }))
    }

    return total.add(formatMsat(our_amount_msat))
  }, Big('0'))

  // const onChain = funds.outputs.reduce((total, { amount_msat }) => total.add(amount_msat), Big('0'))

  // return offChain.add(onChain).toString()
  return offChain.toString()
}

export const sortPaymentsMostRecent = (payments: Payment[]): Payment[] =>
  payments.sort((a, b) => {
    return (
      new Date(b.completedAt || b.startedAt).getTime() -
      new Date(a.completedAt || a.startedAt).getTime()
    )
  })

/** Tries to get exchange rates from Coingecko first, if that fails then try Coinbase */
export async function getBitcoinExchangeRate(): Promise<BitcoinExchangeRates | null> {
  try {
    const coinGecko = await fetch(COIN_GECKO_PRICE_ENDPOINT).then((res) => res.json())
    return coinGecko.bitcoin
  } catch (error) {
    try {
      const coinbase: { data: { rates: BitcoinExchangeRates } } = await fetch(
        COINBASE_PRICE_ENDPOINT
      ).then((res) => res.json())

      return Object.entries(coinbase.data.rates).reduce((acc, [key, value]) => {
        acc[key.toLowerCase() as keyof BitcoinExchangeRates] = value
        return acc
      }, {} as BitcoinExchangeRates)
    } catch (error) {
      return null
    }
  }
}

export const noop = () => {}

export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function parseNodeAddress(address: string): ParsedNodeAddress {
  const [publicKey, host] = address.split('@')
  const [ip, port] = host.split(':')

  return { publicKey, ip, port: port ? parseInt(port) : undefined }
}

export function validateParsedNodeAddress({ publicKey, ip, port }: ParsedNodeAddress): boolean {
  if (!publicKey || !ip) return false

  if (port && (port < 1 || port > 65535)) return false

  if (!publicKey.match(nodePublicKeyRegex)) return false
  if (!ip.match(ipRegex)) return false

  return true
}

export function encryptAllData(pin: string) {
  ENCRYPTED_DATA_KEYS.forEach((key) => {
    const data = window.localStorage.getItem(key)

    if (data) {
      const encrypted = encryptWithAES(data, pin)
      window.localStorage.setItem(key, encrypted)
    }
  })
}

export function parseStoredAuth(storedAuth: string, pin: string): Auth | null {
  try {
    const decryptedAuth = decryptWithAES(storedAuth, pin)
    const auth = JSON.parse(decryptedAuth)
    return auth
  } catch (error) {
    // could not decrypt
    return null
  }
}

export function resetApp() {
  ALL_DATA_KEYS.forEach((key) => localStorage.removeItem(key))
  window.location.reload()
}

export function isProtectedRoute(route: string): boolean {
  switch (route) {
    case '/connect':
    case '/welcome':
      return false
    default:
      return true
  }
}

export function toHexString(byteArray: Uint8Array) {
  return byteArray.reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '')
}

export function hexStringToByte(str: string) {
  const match = str.match(/.{1,2}/g) || []
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}

export function createRandomHex(length = 32) {
  const bytes = new Uint8Array(length)
  return toHexString(crypto.getRandomValues(bytes))
}

export function formatLog(type: 'INFO' | 'WARN' | 'ERROR', msg: string): string {
  return `[${type} - ${new Date().toLocaleTimeString()}]: ${msg}`
}

export const logger = {
  info: (msg: string) => log$.next(formatLog('INFO', msg)),
  warn: (msg: string) => log$.next(formatLog('WARN', msg)),
  error: (msg: string) => log$.next(formatLog('ERROR', msg))
}

export async function loadVConsole() {
  const { default: VConsole } = await import('vconsole')
  new VConsole()
}

export function formatMsat(val: string | number): string {
  if (!val) return '0'
  return typeof val === 'string' ? val.replace('msat', '') : val.toString()
}

export function firstLetterUpperCase(str: string): string {
  return `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`
}

export function mainDomain(host: string): string {
  return host.split('.').reverse().splice(0, 2).reverse().join('.')
}
