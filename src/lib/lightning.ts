import type { GetinfoResponse, Invoice, ListfundsResponse, LnAPI } from './backends'
import {
  FUNDS_STORAGE_KEY,
  INFO_STORAGE_KEY,
  LISTEN_INVOICE_STORAGE_KEY,
  PAYMENTS_STORAGE_KEY
} from './constants'
import {
  auth$,
  disconnect$,
  funds$,
  listeningForAllInvoiceUpdates$,
  nodeInfo$,
  payments$,
  paymentUpdates$,
  pin$
} from './streams'
import type { Payment } from './types'
import {
  createRandomHex,
  decryptWithAES,
  deriveLastPayIndex,
  formatLog,
  getDataFromStorage,
  logger
} from './utils'
import { initLn } from '$lib/backends'
import { invoiceToPayment } from './backends/core-lightning/utils'
import { firstValueFrom } from 'rxjs'
import { filter, map, tap } from 'rxjs/operators'
import type { JsonRpcSuccessResponse } from 'lnmessage/dist/types'

let LN: LnAPI | null = null

export async function getLn(): Promise<LnAPI> {
  if (!LN) {
    const auth = auth$.getValue()

    if (!auth) {
      throw new Error('Authentication needed to create connection to node')
    }

    LN = initLn({ backend: 'core_lightning', auth })
  }

  return LN
}

export async function initialiseData() {
  // 1. get and decrypt all cached data
  const storedInfo = getDataFromStorage(INFO_STORAGE_KEY)
  const storedFunds = getDataFromStorage(FUNDS_STORAGE_KEY)
  const storedPayments = getDataFromStorage(PAYMENTS_STORAGE_KEY)

  let info: GetinfoResponse
  let funds: ListfundsResponse
  let payments: Payment[] = []

  if (storedInfo && storedFunds && storedPayments) {
    const pin = pin$.getValue()

    if (pin) {
      // decrypt data
      info = JSON.parse(decryptWithAES(storedInfo, pin))
      funds = JSON.parse(decryptWithAES(storedFunds, pin))
      payments = JSON.parse(decryptWithAES(storedPayments, pin))
    } else {
      info = JSON.parse(storedInfo)
      funds = JSON.parse(storedFunds)
      payments = JSON.parse(storedPayments)
    }

    // 2. Set state so app is loaded with cached data
    nodeInfo$.next({ data: info as GetinfoResponse, loading: false })
    funds$.next({ data: funds as ListfundsResponse, loading: false })
    payments$.next({ data: payments as Payment[], loading: false })
  }

  const lnApi = await getLn()

  // 3. update funds to ensure correct
  await updateFunds(lnApi)

  // 4. update payments to ensure latest
  const updatedPayments = await updatePayments(lnApi)

  // 5. listen for invoices based on the last index of updated payments
  const lastPayIndex = deriveLastPayIndex(updatedPayments || payments)
  listenForAllInvoiceUpdates(lastPayIndex)
}

export async function refreshData() {
  logger.info(formatLog('INFO', 'Refreshing data'))
  const lnApi = await getLn()

  await updateFunds(lnApi)
  await updateInfo(lnApi)
  await updatePayments(lnApi)

  logger.info(formatLog('INFO', 'Refresh data complete'))
}

export async function updateFunds(lnApi: LnAPI) {
  try {
    funds$.next({ loading: true, data: funds$.getValue().data })
    const funds = await lnApi.listFunds()
    funds$.next({ loading: false, data: funds })

    return funds
  } catch (error) {
    const { message } = error as Error
    funds$.next({ loading: false, data: null, error: message })
  }
}

export async function updateInfo(lnApi: LnAPI) {
  try {
    nodeInfo$.next({ loading: true, data: nodeInfo$.getValue().data })
    const info = await lnApi.getInfo()
    nodeInfo$.next({ loading: false, data: info })

    return info
  } catch (error) {
    const { message } = error as Error
    nodeInfo$.next({ loading: false, data: null, error: message })
  }
}

export async function updatePayments(lnApi: LnAPI) {
  try {
    payments$.next({ loading: true, data: payments$.getValue().data })
    const payments = await lnApi.getPayments()
    payments$.next({ loading: false, data: payments })

    return payments
  } catch (error) {
    const { message } = error as Error
    payments$.next({ loading: false, data: null, error: message })
  }
}

export async function listenForAllInvoiceUpdates(payIndex: number): Promise<void> {
  listeningForAllInvoiceUpdates$.next(true)
  const lnApi = await getLn()
  const disconnectProm = firstValueFrom(disconnect$)

  // make a listen request for this pay index
  try {
    logger.info(formatLog('INFO', `Listening for invoice updates after pay index: ${payIndex}`))

    const reqId = createRandomHex(8)
    localStorage.setItem(LISTEN_INVOICE_STORAGE_KEY, JSON.stringify({ payIndex, reqId }))
    const invoice = await Promise.race([lnApi.waitAnyInvoice(payIndex), disconnectProm])

    // disconnected
    if (!invoice) return

    logger.info(formatLog('INFO', `Invoice update received with status: ${invoice.status}`))

    if (invoice.status !== 'unpaid') {
      const payment = invoiceToPayment(invoice)
      paymentUpdates$.next(payment)
    }

    const newLastPayIndex = invoice.pay_index ? invoice.pay_index : payIndex

    listenForAllInvoiceUpdates(newLastPayIndex)
  } catch (error) {
    console.error(error)
    listeningForAllInvoiceUpdates$.next(false)
  }
}

export async function waitForAndUpdatePayment(payment: Payment): Promise<void> {
  const lnApi = await getLn()
  try {
    const update = await lnApi.waitForInvoicePayment(payment)
    paymentUpdates$.next(update)
  } catch (error) {
    //
  }
}