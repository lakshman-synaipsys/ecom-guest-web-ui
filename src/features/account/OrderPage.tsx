import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { dateTime, money, phone as formatPhone, qty as qtyText, whenText } from '@/lib/format';
import {
  useCancelOrder, useOrder, useOrderSupportTickets, useRaiseQuery, useReorder,
  useReviewedLines, useOrderProductReviews, useSubmitProductReview, useStoreConfig, uploadReviewPhoto,
} from '@/lib/queries';
import { Art, Chip, ErrorNote, Sheet } from '@/components/ui';
import { Loading } from '@/components/Loaders';
import { OrderLotTimeline } from '@/components/OrderLotTimeline';
import { STATUS_TEXT } from './OrdersPage';

/**
 * One order, tracked.
 *
 * Layout: a summary card first (what, when, how much), then the live
 * tracker, then what is in each shop's bundle, then the bill, delivery
 * details, history and help. Cards share one radius and one rhythm so the
 * page reads top to bottom without competing for attention.
 */

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2';

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={clsx('tracking-wide text-sun', className)} aria-label={`${value} out of 5 stars`}>
      {'★'.repeat(value)}<span className="text-line-strong">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={clsx('h-4 w-4', className)} aria-hidden>
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  bag: 'M6 7h12l1 13H5L6 7Zm3 0a3 3 0 0 1 6 0',
};

function Card({ title, aside, children, className }:
  { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('card mt-5 p-4 sm:p-5', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-title">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function OrderPage() {
  const { orderId = '' } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get('placed') === '1';

  const order = useOrder(orderId);
  const config = useStoreConfig();
  const cancel = useCancelOrder();
  const reorder = useReorder();
  const raiseQuery = useRaiseQuery();
  const supportTickets = useOrderSupportTickets(orderId);
  const submitProductReview = useSubmitProductReview();
  const delivered = order.data?.order.status === 'DELIVERED';
  const reviewedLines = useReviewedLines(orderId, delivered);
  const productReviews = useOrderProductReviews(orderId, delivered);
  const [expandedReview, setExpandedReview] = useState<{
    name: string; rating: number; reviewText: string | null; imagePublicIds: string[];
  } | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reordered, setReordered] = useState<number | null>(null);

  const [queryOpen, setQueryOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querySent, setQuerySent] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<{ lineId: string; name: string; shopName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewUploading, setReviewUploading] = useState(false);

  if (order.isLoading) return <Loading label="Loading your order..." />;
  if (!order.data) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand text-ink-muted">
          <Icon d={ICONS.bag} className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-lg font-semibold">Order not found</h1>
        <p className="mt-1 text-sm text-ink-muted">
          It may have been removed, or the link is incorrect.
        </p>
        <Link to="/orders" className="btn-primary btn-sm mt-5">Back to your orders</Link>
      </div>
    );
  }

  const { order: card, money: totals, delivery, bundles, tracker, history,
          rider, canCancel } = order.data;
  const status = STATUS_TEXT[card.status];
  const itemCount = bundles.reduce((sum, b) => sum + b.items.length, 0);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'That did not work.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <Link to="/orders"
            className={clsx('inline-flex items-center gap-1 rounded-full py-1 pr-2 text-xs font-semibold text-ink-muted hover:text-leaf', focusRing)}>
        <span aria-hidden className="text-base leading-none">&lsaquo;</span> Your orders
      </Link>

      {justPlaced && (
        <div role="status"
             className="mt-3 flex items-center gap-4 rounded-card border border-leaf-line bg-leaf-soft p-4 animate-fade-up">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm" aria-hidden>🎉</span>
          <div>
            <h1 className="font-display text-lg font-semibold text-leaf-dark">Order placed</h1>
            <p className="mt-0.5 text-sm text-leaf-dark/80">
              We will start shopping shortly and call you if anything is not available.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ summary */}
      <section className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {!justPlaced && <h1 className="font-mono text-lg font-semibold">{card.orderNumber}</h1>}
              {justPlaced && <p className="font-mono text-lg font-semibold">{card.orderNumber}</p>}
              <Chip tone={status.tone}>{status.label}</Chip>
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">
              {card.status === 'DELIVERED'
                ? `Delivered ${dateTime(card.deliveredAt)}`
                : card.status === 'CANCELLED'
                  ? (delivery.cancelReason ?? 'Cancelled')
                  : `Expected ${whenText(card)}`}
            </p>
          </div>

          <div className="text-right">
            <p className="font-display text-3xl font-semibold leading-none tabular">
              {money(card.payablePaise)}
            </p>
            <p className="mt-1.5 text-2xs text-ink-muted">
              {card.finalised ? 'Final amount' : 'Estimated'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-sand/50 px-4 py-2.5 text-xs text-ink-soft sm:px-5">
          <span>{itemCount} item{itemCount === 1 ? '' : 's'} from {bundles.length} shop{bundles.length === 1 ? '' : 's'}</span>
          <span className="hidden h-3 w-px bg-line-strong sm:block" aria-hidden />
          <span>{card.paymentMode === 'COD' ? 'Pay cash on delivery' : 'Paid online'}</span>
        </div>
      </section>

      {error && <div className="mt-4" role="alert"><ErrorNote message={error} /></div>}

      {/* ------------------------------------------------------ tracker */}
      {!['CANCELLED', 'RETURNED'].includes(card.status) && bundles.length === 1 && (
        <Card title="Where it is">
          <OrderLotTimeline
            bundle={bundles[0]}
            orderStatus={card.status}
            history={history}
            rider={rider}
          />
        </Card>
      )}

      {/* ------------------------------------------------------ bundles */}
      <section className="mt-5 space-y-5" aria-label="Items in this order">
        {bundles.map((bundle) => (
          <div key={bundle.lotId} className="card overflow-hidden">
            <header className="flex items-center gap-3 border-b border-line bg-sand/60 px-4 py-3 sm:px-5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white">
                <Art publicId={bundle.shopImagePublicId} name={bundle.shopName} size={96}
                     rounded="rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/shops/${bundle.shopSlug}`}
                      className={clsx('block truncate rounded text-sm font-semibold hover:text-leaf', focusRing)}>
                  {bundle.shopName}
                </Link>
                <p className="text-2xs text-ink-muted">
                  {bundle.items.length} item{bundle.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-2xs font-medium capitalize text-ink-soft ring-1 ring-line">
                {bundle.status.toLowerCase().replace(/_/g, ' ')}
              </span>
            </header>

            <ul className="divide-y divide-line">
              {bundle.items.map((item) => {
                const short = item.fulfilledQty !== null && item.fulfilledQty < item.orderedQty;
                const gone = item.status === 'UNAVAILABLE';
                const changed = item.lineFinalPaise !== null && item.lineFinalPaise !== item.lineEstimatePaise;
                const canReview = card.status === 'DELIVERED' && !gone && item.status !== 'REMOVED';

                return (
                  <li key={item.lineId} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <div className={clsx('h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand ring-1 ring-line', gone && 'opacity-50 grayscale')}>
                      <Art publicId={item.imagePublicId} name={item.name} size={120} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={clsx('text-sm font-medium leading-snug', gone && 'text-ink-muted line-through')}>
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-2xs text-ink-muted">
                        {qtyText(item.orderedQty, item.unitType)}
                        {item.unitLabel && ` · ${item.unitLabel}`}
                        {' · '}{money(item.unitPricePaise)} each
                      </p>

                      {(short || gone || item.note) && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {gone && <Chip tone="carrot">Not available</Chip>}
                          {short && (
                            <Chip tone="sun">only {qtyText(item.fulfilledQty!, item.unitType)} found</Chip>
                          )}
                          {item.note && <Chip>{item.note}</Chip>}
                        </div>
                      )}

                      {canReview && (
                        <div className="mt-2.5">
                          {reviewedLines.data?.includes(item.lineId) ? (() => {
                            const review = productReviews.data?.find((entry) => entry.lineId === item.lineId);
                            const words = (review?.reviewText ?? '').trim().split(/\s+/).filter(Boolean);
                            const preview = words.slice(0, 5).join(' ');
                            return (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-leaf-soft/60 px-2.5 py-1.5 text-xs">
                                <span className="font-semibold text-leaf">✓ Reviewed</span>
                                {review && <Stars value={review.rating} />}
                                {preview && (
                                  <span className="min-w-0 truncate text-ink-soft">
                                    {preview}{words.length > 5 ? '...' : ''}
                                  </span>
                                )}
                                {review && (
                                  <button type="button"
                                    className={clsx('rounded font-semibold text-leaf-dark underline-offset-2 hover:underline', focusRing)}
                                    onClick={() => setExpandedReview({ name: item.name, rating: review.rating,
                                      reviewText: review.reviewText, imagePublicIds: review.imagePublicIds })}>
                                    Read more
                                  </button>
                                )}
                              </div>
                            );
                          })() : (
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => {
                                setReviewTarget({ lineId: item.lineId, name: item.name, shopName: bundle.shopName });
                                setReviewRating(0);
                                setReviewComment('');
                                setReviewFiles([]);
                                setReviewError(null);
                              }}
                            >
                              <span className="text-sun" aria-hidden>★</span> Review product
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={clsx('text-sm font-semibold tabular', gone && 'text-ink-faint line-through')}>
                        {money(item.lineFinalPaise ?? item.lineEstimatePaise)}
                      </p>
                      {changed && (
                        <p className="text-2xs tabular text-ink-faint line-through">
                          {money(item.lineEstimatePaise)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {bundles.length > 1 && (
              <div className="border-t border-line bg-sand/30 px-4 py-4 sm:px-5">
                <OrderLotTimeline
                  bundle={bundle}
                  orderStatus={card.status}
                  history={history}
                  rider={rider}
                />
              </div>
            )}
          </div>
        ))}
      </section>

      {/* -------------------------------------------------------- money */}
      <Card title="Bill details">
        <Row label="Items" value={money(totals.itemsFinalPaise ?? totals.itemsEstimatePaise)} />
        <Row label="Delivery" value={totals.deliveryFeePaise === 0 ? 'Free' : money(totals.deliveryFeePaise)}
             valueClass={totals.deliveryFeePaise === 0 ? 'font-semibold text-leaf' : undefined} />
        {totals.handlingFeePaise > 0 && (
          <Row label="Extra shops" value={money(totals.handlingFeePaise)} />
        )}
        {totals.discountPaise > 0 && (
          <Row label="Discount" value={`-${money(totals.discountPaise)}`} valueClass="font-semibold text-leaf" />
        )}

        <div className="my-3 border-t border-dashed border-line-strong" />

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">{card.finalised ? 'Total' : 'Estimated total'}</span>
          <span className="font-display text-2xl font-semibold tabular">{money(card.payablePaise)}</span>
        </div>
        {!card.finalised && (
          <p className="mt-1 text-2xs text-ink-muted">
            The final amount is set once the shops weigh and pack your items.
          </p>
        )}
      </Card>

      {/* ----------------------------------------------------- delivery */}
      <Card title="Delivering to">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-ink-soft">
            <Icon d={ICONS.pin} />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{delivery.contactName}</p>
            <p className="text-ink-soft">
              {delivery.addressLine}
              {delivery.landmark && `, near ${delivery.landmark}`}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{formatPhone(delivery.contactPhone)}</p>
          </div>
        </div>
        {delivery.customerNote && (
          <p className="mt-3 rounded-xl bg-sand px-3 py-2.5 text-xs italic text-ink-soft">
            &ldquo;{delivery.customerNote}&rdquo;
          </p>
        )}
      </Card>

      {/* ------------------------------------------------------ actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          className="btn-primary"
          disabled={reorder.isPending}
          onClick={() => void run(async () => {
            const result = await reorder.mutateAsync(orderId);
            setReordered(result.added);
          })}
        >
          {reorder.isPending ? 'Adding...' : 'Order this again'}
        </button>

        {canCancel && (
          <button className="btn-ghost text-carrot" onClick={() => setCancelOpen(true)}>
            Cancel this order
          </button>
        )}
      </div>

      {reordered !== null && (
        <p role="status" className="mt-3 rounded-xl border border-leaf-line bg-leaf-soft px-3 py-2.5 text-sm text-leaf-dark">
          {reordered === 0
            ? 'Everything from that order is already in your basket.'
            : `${reordered} item${reordered === 1 ? '' : 's'} added to your basket. `}
          {reordered > 0 && <Link to="/cart" className="font-semibold underline">Open basket</Link>}
        </p>
      )}

      {/* ------------------------------------------------------ history */}
      {history.length > 0 && (
        <Card title="Order history">
          <ol>
            {history.map((step, index) => {
              const last = index === history.length - 1;
              return (
                <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />}
                  <span className="relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-leaf bg-surface" />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{step.label}</p>
                    {step.state && <p className="text-2xs text-ink-muted">{step.state}</p>}
                    <p className="text-2xs text-ink-faint">{dateTime(step.at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {/* -------------------------------------------------------- help */}
      <Card title="Need help with this order?">
        <p className="-mt-2 text-xs text-ink-muted">
          Something wrong, a question, or just want to tell us how it went.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {config.data?.supportPhone && (
            <a href={`tel:${config.data.supportPhone}`} className="btn-secondary justify-center gap-2">
              <Icon d={ICONS.phone} /> Call us
            </a>
          )}
          {config.data?.supportWhatsapp && (
            <a
              href={`https://wa.me/${config.data.supportWhatsapp.replace(/\D/g, '')}`
                + `?text=${encodeURIComponent(`Hi, I have a question about order ${card.orderNumber}.`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary justify-center gap-2"
            >
              <Icon d={ICONS.chat} /> WhatsApp us
            </a>
          )}
          <button className="btn-secondary justify-center gap-2" onClick={() => setQueryOpen(true)}>
            <Icon d={ICONS.edit} /> Raise a query
          </button>
        </div>

        {card.status === 'DELIVERED' && (
          <p className="mt-3 text-xs text-ink-muted">You can also rate each product in the item list above.</p>
        )}

        {querySent && (
          <p role="status" className="mt-3 rounded-xl bg-leaf-soft px-3 py-2 text-sm text-leaf-dark">
            Your query was saved. Replies will show up here.
          </p>
        )}

        {(supportTickets.data?.length ?? 0) > 0 && (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <h3 className="text-sm font-semibold">Your queries</h3>
            {supportTickets.data?.map((ticket) => (
              <article key={ticket.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Ticket #{ticket.id.slice(0, 8)}</span>
                  <span className="rounded-full bg-sunken px-2.5 py-1 text-2xs font-medium capitalize">
                    {ticket.status.replaceAll('_', ' ').toLowerCase()}
                  </span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {ticket.messages.map((message) => {
                    const mine = message.senderRole === 'CUSTOMER';
                    return (
                      <div key={message.id} className={clsx('flex flex-col', mine ? 'items-end' : 'items-start')}>
                        <div className={clsx('max-w-[88%] rounded-2xl px-3 py-2',
                          mine ? 'rounded-br-md bg-leaf-soft text-leaf-dark' : 'rounded-bl-md bg-sand text-ink')}>
                          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                        </div>
                        <p className="mt-1 px-1 text-2xs text-ink-faint">
                          {mine ? 'You' : 'QCommerce support'} · <time>{dateTime(message.createdAt)}</time>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------ query sheet */}
      <Sheet
        open={queryOpen}
        onClose={() => setQueryOpen(false)}
        title="Raise a query"
        footer={
          <button
            className="btn-primary btn-block"
            disabled={raiseQuery.isPending || queryText.trim().length < 3}
            onClick={async () => {
              setQueryError(null);
              try {
                await raiseQuery.mutateAsync({ orderId, message: queryText.trim() });
                setQuerySent(true);
                setQueryText('');
                setQueryOpen(false);
              } catch (err) {
                setQueryError(err instanceof ApiRequestError ? err.message : 'That did not work.');
              }
            }}
          >
            {raiseQuery.isPending ? 'Sending...' : 'Send query'}
          </button>
        }
      >
        <p className="text-sm text-ink-soft">
          Tell us what happened with {card.orderNumber} and we will get back to you.
        </p>
        {queryError && <div className="mt-3" role="alert"><ErrorNote message={queryError} /></div>}
        <textarea
          className="input mt-3 min-h-28"
          autoFocus
          aria-label="Your message"
          placeholder="The tomatoes were bruised, a packet was missing..."
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
        />
      </Sheet>

      {/* ----------------------------------------------- review sheet */}
      <Sheet
        open={reviewTarget !== null}
        onClose={() => { if (!reviewUploading) setReviewTarget(null); }}
        title={reviewTarget ? `Review ${reviewTarget.name}` : 'Review product'}
        footer={
          <button
            className="btn-primary btn-block"
            disabled={submitProductReview.isPending || reviewUploading || reviewRating === 0 || !reviewTarget}
            onClick={async () => {
              if (!reviewTarget) return;
              setReviewError(null);
              setReviewUploading(true);
              try {
                const imagePublicIds: string[] = [];
                for (const file of reviewFiles) {
                  imagePublicIds.push(await uploadReviewPhoto(orderId, reviewTarget.lineId, file));
                }
                await submitProductReview.mutateAsync({
                  orderId,
                  lineId: reviewTarget.lineId,
                  rating: reviewRating,
                  reviewText: reviewComment.trim() || undefined,
                  imagePublicIds,
                });
                setReviewTarget(null);
                setReviewRating(0);
                setReviewComment('');
                setReviewFiles([]);
              } catch (err) {
                setReviewError(err instanceof ApiRequestError ? err.message
                  : err instanceof Error ? err.message : 'That did not work. Please try again.');
              } finally {
                setReviewUploading(false);
              }
            }}
          >
            {reviewUploading ? 'Uploading and submitting…'
              : submitProductReview.isPending ? 'Submitting…' : 'Submit review'}
          </button>
        }
      >
        {reviewTarget && (
          <p className="text-sm text-ink-soft">
            Bought from {reviewTarget.shopName}. Your verified review helps other customers and is shared with this shop.
          </p>
        )}
        {reviewError && <div className="mt-3" role="alert"><ErrorNote message={reviewError} /></div>}

        <div className="mt-5 text-center">
          <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={reviewRating === n}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                onClick={() => setReviewRating(n)}
                className={clsx('rounded-lg p-1 text-4xl leading-none transition-transform active:scale-90', focusRing,
                  n <= reviewRating ? 'text-sun' : 'text-line-strong hover:text-sun/60')}
              >&#9733;</button>
            ))}
          </div>
          <p className="mt-1 h-5 text-sm font-medium text-ink-soft" aria-live="polite">
            {RATING_WORDS[reviewRating]}
          </p>
        </div>

        <textarea
          className="input mt-3 min-h-28"
          maxLength={2000}
          aria-label="Your review"
          placeholder="Share your experience, product quality or any mismatch (optional)"
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
        />
        <p className="mt-1 text-right text-2xs text-ink-muted">{reviewComment.length}/2000</p>

        {config.data?.imagesEnabled && (
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="review-photos">Add photos (up to 5)</label>
            <input
              id="review-photos"
              className="input mt-2"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []).slice(0, 5);
                const tooLarge = files.find((file) => file.size > 8 * 1024 * 1024);
                if (tooLarge) {
                  setReviewError('Each photo must be 8 MB or smaller.');
                  setReviewFiles([]);
                } else {
                  setReviewError(null);
                  setReviewFiles(files);
                }
              }}
            />
            <p className="mt-1 text-xs text-ink-muted">JPG, PNG or WebP. Photos help explain damage or quality issues.</p>
            {reviewFiles.length > 0 && (
              <p className="mt-2 text-xs font-medium text-leaf">{reviewFiles.length} photo{reviewFiles.length === 1 ? '' : 's'} selected</p>
            )}
          </div>
        )}
      </Sheet>

      {/* ----------------------------------------------- cancel sheet */}
      <Sheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        footer={
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setCancelOpen(false)}>
              Keep order
            </button>
            <button
              className="btn-carrot flex-1"
              disabled={cancel.isPending}
              onClick={() => void run(async () => {
                await cancel.mutateAsync({ orderId, reason });
                setCancelOpen(false);
              })}
            >
              {cancel.isPending ? 'Cancelling...' : 'Cancel order'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-soft">
          Nothing has been bought yet, so there is nothing to pay. Would you mind telling us why?
        </p>
        <input
          className="input mt-3"
          autoFocus
          aria-label="Reason for cancelling"
          placeholder="Changed my mind, ordered by mistake..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Sheet>

      {/* ------------------------------------------- expanded review */}
      {expandedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
             role="presentation"
             onKeyDown={(event) => { if (event.key === 'Escape') setExpandedReview(null); }}
             onMouseDown={(event) => {
               if (event.target === event.currentTarget) setExpandedReview(null);
             }}>
          <section role="dialog" aria-modal="true" aria-labelledby="review-detail-title"
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-2xs text-ink-muted">Your review</p>
                <h2 id="review-detail-title" className="text-base font-semibold leading-snug">{expandedReview.name}</h2>
              </div>
              <button type="button" aria-label="Close review" onClick={() => setExpandedReview(null)}
                className={clsx('rounded-full p-1.5 text-ink-muted hover:bg-sand hover:text-ink', focusRing)}>✕</button>
            </div>

            <Stars value={expandedReview.rating} className="mt-3 block text-xl" />

            {expandedReview.reviewText ? (
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {expandedReview.reviewText}
              </p>
            ) : <p className="mt-2 text-sm text-ink-muted">No written message was added.</p>}

            {expandedReview.imagePublicIds.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-ink-soft">Photos</p>
                <div className="flex flex-wrap gap-2">
                  {expandedReview.imagePublicIds.map((image, index) => (
                    <div key={image} className="h-16 w-16 overflow-hidden rounded-xl border border-line">
                      <Art publicId={image} name={`Review photo ${index + 1}`} size={128} rounded="rounded-xl" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="btn-secondary btn-sm mt-5 w-full"
              onClick={() => setExpandedReview(null)}>Close</button>
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className={clsx('text-sm tabular', valueClass)}>{value}</span>
    </div>
  );
}
