import { Link, useLocation } from 'react-router-dom';
import { useStoreConfig } from '@/lib/queries';
import { Wordmark } from '@/components/Brand';

/**
 * Terms and privacy.
 *
 * Written the way the good Indian commerce apps write them: short
 * sections, plain sentences, and honest about the thing that genuinely
 * differs here from buying a phone online - that we buy on the customer's
 * behalf from shops we do not own.
 *
 * <b>This is a starting draft, not legal advice.</b> Before this goes live
 * a lawyer needs to read it against the Consumer Protection (E-Commerce)
 * Rules 2020, the FSSAI licensing conditions for a food e-commerce
 * operator, the Legal Metrology (Packaged Commodities) Rules, and - if
 * medicines are ever sold - the Drugs and Cosmetics Rules. The placeholders
 * for the entity name, GSTIN and FSSAI number come from Settings in the
 * console, so filling them in is a five-minute job and not a code change.
 */
export function LegalPage() {
  const location = useLocation();
  const config = useStoreConfig();
  const privacy = location.pathname.startsWith('/privacy');
  const zone = config.data?.zone;

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Link to="/" className="text-xs font-semibold text-ink-muted hover:text-leaf">
        &lsaquo; Home
      </Link>

      <header className="mb-7 mt-3">
        <Wordmark size="sm" />
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
          {privacy ? 'Privacy' : 'Terms of service'}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Please read these before you order. If anything here is unclear, call us and ask -
          that is a better use of everyone's time than a dispute later.
        </p>
      </header>

      <div className="space-y-7 text-sm leading-relaxed text-ink-soft">
        {privacy ? <Privacy /> : <Terms zoneKm={zone ? zone.radiusMetres / 1000 : 5} />}

        <section className="rounded-card border border-line bg-surface p-4 text-xs">
          <p className="font-semibold text-ink">Who you are dealing with</p>
          <p className="mt-1.5">
            The registered business name, GSTIN and FSSAI licence number are set in the console
            under Settings and printed on every order once filled in. Until then this page shows
            placeholders, which is deliberate - an invented licence number would be worse than a
            missing one.
          </p>
          <p className="mt-2">
            Questions, complaints and grievances: use the phone number on your order, or the
            support number in Settings. We aim to answer the same day and within 48 hours at the
            outside.
          </p>
        </section>

        <p className="text-xs text-ink-faint">
          Last updated when this page was written. We will note the date here whenever these
          change, and tell you in the app if a change affects an order you have already placed.
        </p>
      </div>
    </article>
  );
}

function Terms({ zoneKm }: { zoneKm: number }) {
  return (
    <>
      <Section title="What we actually do">
        <p>
          We are a delivery service, not a shop. When you place an order, we buy the things on
          your list from the shops listed in the app, on your behalf, and bring them to you. The
          shops are independent businesses. We choose which shops appear here and we are
          responsible for getting your order right, but the goods themselves are theirs.
        </p>
      </Section>

      <Section title="Where and when we deliver">
        <p>
          We deliver within about {zoneKm} km of our hub, during the hours shown on the home
          page. If an address is outside that area we say so before you save it, rather than at
          checkout. Delivery times are estimates. We try hard to keep them and we will tell you
          if we cannot.
        </p>
      </Section>

      <Section title="Prices, and why some of them move">
        <p>
          Prices in the app are the shop's prices as we last recorded them. We do not add a
          margin to the shelf price; we charge a delivery fee, and a small fee when an order
          spans more than two shops, both shown before you pay.
        </p>
        <p>
          <strong className="text-ink">The price you see is the price you pay.</strong> Every
          item has a fixed price shown in the app. If you order half a kilo you pay for half a
          kilo at the listed rate; nothing is re-priced at the shop. If an item cannot be found
          we remove it and refund its amount.
        </p>
      </Section>

      <Section title="If something is not available">
        <p>
          Shops run out. When that happens we look for the closest substitute, tell you what it
          is and what it costs, and only send it if you say yes. If nothing suitable exists we
          remove the item and reduce your total. Either way you see it on the order before it
          arrives.
        </p>
      </Section>

      <Section title="Cancelling">
        <p>
          You can cancel free of charge at any time until somebody starts shopping your order -
          the app shows a Cancel button while that is true. Once the goods are off the shelf we
          cannot always put them back, so call us instead and we will sort out what is fair.
        </p>
        <p>
          We may cancel an order ourselves if the shops are closed, the address turns out to be
          unreachable, or we cannot contact you. If you have already paid, you get all of it
          back.
        </p>
      </Section>

      <Section title="Returns and refunds">
        <p>
          Tell the rider at the door and hand it straight back - that is by far the easiest way,
          and it costs you nothing. If you find a problem after they have left, tell us the same
          day for anything fresh, and within 48 hours for anything packaged.
        </p>
        <p>
          Damaged, spoiled, expired or wrong items are refunded or replaced in full. Cash orders
          are refunded in cash or taken off your next order, whichever you prefer. Online
          payments go back to the same account, usually within five to seven working days.
        </p>
        <p>
          We cannot take back things that have been opened or used, unless the problem is with
          the goods themselves.
        </p>
      </Section>

      <Section title="Medicines">
        <p>
          Medicines are supplied only by licensed pharmacies, and only against a valid
          prescription where the law requires one. We will ask for that prescription before the
          order goes out. We are not a pharmacy and we do not give medical advice.
        </p>
      </Section>

      <Section title="Paying">
        <p>
          Cash on delivery is available on every order. Online payment is offered once our
          payment provider is live; when it is, your card and UPI details go straight to them
          and are never stored by us.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          Your phone number is your account. Keep the one-time codes to yourself - anyone with
          a code can order as you. Tell us immediately if you think somebody else has access,
          and we will end all your sessions.
        </p>
        <p>
          We may close an account that is used to abuse riders or shop staff, to place orders
          nobody intends to accept, or to break these terms.
        </p>
      </Section>

      <Section title="What we are responsible for">
        <p>
          We are responsible for delivering what you ordered, in the condition it left the
          shop, to the address you gave us. We are not responsible for what a manufacturer put
          in a packet, and for anything you react badly to, the packet's own label is the
          authority, not our description of it.
        </p>
        <p>
          Nothing in these terms takes away rights you have under the Consumer Protection Act
          2019 or any other law that applies to you.
        </p>
      </Section>

      <Section title="Disputes">
        <p>
          Call us first. Almost everything is settled in one conversation. If it is not, these
          terms are governed by Indian law and the courts where our business is registered have
          jurisdiction.
        </p>
      </Section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Section title="What we collect, and why">
        <p>
          Your phone number, because it is your account and how the rider reaches you. Your
          name, so they know who to ask for. Your delivery addresses and their map pins, because
          a landmark alone does not find a house. Your order history, because you asked us to
          keep it and because "order this again" would be useless without it.
        </p>
        <p>
          Your location, only if you allow it, and only to sort shops by distance. We do not
          keep a trail of where you have been.
        </p>
      </Section>

      <Section title="What we do not collect">
        <p>
          We do not ask for your date of birth, your email, your gender or your income. We do
          not store card numbers - when online payment is live, those go straight to the payment
          provider. We do not sell anything about you to anyone, and we do not run advertising.
        </p>
      </Section>

      <Section title="Who else sees it">
        <p>
          The rider delivering your order sees your name, phone number and address, because they
          have to. The shop does not - they see a list of items. Our SMS provider sees your
          number so it can send the message. Nobody else.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Order records are kept for as long as tax and consumer law require, which in India is
          several years. Everything else we keep until you ask us to delete it.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          Ask us and we will tell you exactly what we hold about you, correct anything wrong,
          and delete your account. Deleting the account removes your addresses and your name;
          the orders themselves stay in our books because we are required to keep them, but they
          stop being connected to a person we can identify.
        </p>
      </Section>

      <Section title="Keeping it safe">
        <p>
          Sign-in is by one-time code, so there is no password to steal. Sessions expire and can
          be ended from any device. Access to customer data inside the business is limited to
          the people running orders, and every change to an order is logged with who made it.
        </p>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
