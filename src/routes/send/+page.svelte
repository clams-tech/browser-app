<script lang="ts">
  import Big from 'big.js'
  import { goto } from '$app/navigation'
  import Destination from '$lib/components/Destination.svelte'
  import Summary from '$lib/components/Summary.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import { BitcoinDenomination, type PaymentType } from '$lib/types'
  import { convertValue } from '$lib/conversion'
  import { paymentUpdates$, settings$, SvelteSubject } from '$lib/streams'
  import Amount from '$lib/components/Amount.svelte'
  import Description from '$lib/components/Description.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import { createRandomHex } from '$lib/utils'

  let previousSlide = 0
  let slide = 0

  let errorMsg = ''

  function next() {
    previousSlide = slide
    slide = slide + 1
  }

  function prev() {
    previousSlide = slide
    slide = slide - 1
  }

  function to(i: number) {
    slide = i
  }

  let requesting = false

  type SendPayment = {
    destination: string
    type: PaymentType | null
    description: string
    expiry: number | null
    timestamp: number | null
    amount: string // invoice amount
    value: string // user input amount
  }

  const sendPayment$ = new SvelteSubject<SendPayment>({
    destination: '',
    type: null,
    description: '',
    expiry: null,
    timestamp: null,
    amount: '',
    value: ''
  })

  async function sendPayment() {
    requesting = true
    const { destination, value, type, description } = sendPayment$.getValue()
    const { primaryDenomination } = $settings$

    try {
      let paymentId
      const lnApi = lightning.getLn()

      switch (type) {
        case 'payment_request': {
          const id = createRandomHex()

          const payment = await lnApi.payInvoice({
            id,
            bolt11: destination,
            amount_msat:
              value && value !== '0'
                ? Big(
                    convertValue({
                      value,
                      from: primaryDenomination,
                      to: BitcoinDenomination.msats
                    }) as string
                  )
                    .round()
                    .toString()
                : undefined
          })

          paymentUpdates$.next({ ...payment, description })
          paymentId = payment.id

          break
        }
        case 'node_public_key': {
          const id = createRandomHex()

          const payment = await lnApi.payKeysend({
            id,
            destination,
            amount_msat: Big(
              convertValue({
                value,
                from: primaryDenomination,
                to: BitcoinDenomination.msats
              }) as string
            )
              .round()
              .toString()
          })

          paymentUpdates$.next(payment)
          paymentId = payment.id

          break
        }
      }

      // delay to allow time for node to update
      setTimeout(() => lightning.updateFunds(lnApi), 1000)
      goto(`/payments/${paymentId}`)
    } catch (error) {
      requesting = false

      const { code, message } = error as { code: number; message: string }

      errorMsg = code === -32602 ? message : $translate(`app.errors.${code}`, { default: message })
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.send')}</title>
</svelte:head>

{#if slide === 0}
  <Slide
    back={() => {
      goto('/')
    }}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <Destination
      next={() =>
        $sendPayment$.type === 'payment_request' &&
        $sendPayment$.amount &&
        $sendPayment$.amount !== '0'
          ? to(3)
          : next()}
      bind:destination={$sendPayment$.destination}
      bind:type={$sendPayment$.type}
      bind:description={$sendPayment$.description}
      bind:expiry={$sendPayment$.expiry}
      bind:timestamp={$sendPayment$.timestamp}
      bind:amount={$sendPayment$.amount}
      on:clipboardError={({ detail }) => (errorMsg = detail)}
    />
  </Slide>
{/if}

{#if slide === 1}
  <Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
    <Amount
      direction="send"
      bind:value={$sendPayment$.value}
      next={() => ($sendPayment$.description ? to(3) : next())}
      required
    />
  </Slide>
{/if}

{#if slide === 2}
  <Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
    <Description {next} bind:description={$sendPayment$.description} />
  </Slide>
{/if}

{#if slide === 3}
  <Slide
    back={() => ($sendPayment$.amount ? to(0) : prev())}
    direction={previousSlide > slide ? 'right' : 'left'}
  >
    <Summary
      direction="send"
      type={$sendPayment$.type}
      destination={$sendPayment$.destination}
      description={$sendPayment$.description}
      expiry={$sendPayment$.expiry}
      timestamp={$sendPayment$.timestamp}
      value={$sendPayment$.value && $sendPayment$.value !== '0'
        ? $sendPayment$.value
        : convertValue({
            value: $sendPayment$.amount,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          })}
      {requesting}
      on:complete={sendPayment}
    />
  </Slide>
{/if}

<div class="absolute bottom-4">
  <ErrorMsg bind:message={errorMsg} />
</div>
