import { useState } from 'react';
import { useProductReviews, useShopReviews } from '@/lib/queries';
import { Art } from '@/components/ui';
import type { ReviewCard, ReviewFeed } from '@/lib/types';

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return <span className="tracking-wide text-sun" aria-label={`${rating} out of 5 stars`}>{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span>;
}

function ReviewFeedView({ title, feed, loading }: { title: string; feed: ReviewFeed | undefined; loading: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const rows = feed?.reviews ?? [];
  return (
    <section className="mt-7 border-t border-line pt-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {feed && feed.reviewCount > 0
              ? <><strong>{feed.averageRating.toFixed(1)}</strong> / 5 · {feed.reviewCount} verified review{feed.reviewCount === 1 ? '' : 's'}</>
              : 'No reviews yet'}
          </p>
        </div>
        {feed && feed.reviewCount > 0 && <Stars rating={feed.averageRating} />}
      </div>
      {loading && <p className="mt-3 text-sm text-ink-muted">Loading reviews…</p>}
      {!loading && rows.length === 0 && <p className="mt-3 text-sm text-ink-muted">Be the first to share your experience after purchasing.</p>}
      <div className="mt-4 space-y-3">
        {(showAll ? rows : rows.slice(0, 4)).map((review) => <ReviewRow key={review.id} review={review} />)}
      </div>
      {rows.length > 4 && (
        <button className="btn-secondary btn-sm mt-3" onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer reviews' : `See more reviews`}
        </button>
      )}
    </section>
  );
}

function ReviewRow({ review }: { review: ReviewCard }) {
  return (
    <article className="rounded-card border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{review.customerName || 'Customer'}</p>
          {review.productName && <p className="mt-0.5 text-xs text-ink-muted">{review.productName} · {review.shopName}</p>}
        </div>
        <div className="text-right">
          <Stars rating={review.rating} />
          <p className="mt-0.5 text-2xs text-ink-muted">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      {review.reviewText && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{review.reviewText}</p>}
      {review.imagePublicIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.imagePublicIds.map((image, index) => <div key={image} className="h-20 w-20 overflow-hidden rounded-lg border border-line">
            <Art publicId={image} name={`Customer review photo ${index + 1}`} size={180} rounded="rounded-lg" />
          </div>)}
        </div>
      )}
    </article>
  );
}

export function ProductReviewSection({ productId, shopId }: { productId: string; shopId: string }) {
  const query = useProductReviews(productId, shopId);
  // Product details should show only reviews for this exact product at the
  // currently selected shop, and no empty section when none exist.
  if (!query.isLoading && (!query.data || query.data.reviewCount === 0)) return null;
  return <ReviewFeedView title="Product reviews for this shop" feed={query.data} loading={query.isLoading} />;
}

export function ShopReviewSection({ shopId }: { shopId: string }) {
  const query = useShopReviews(shopId);
  return <ReviewFeedView title="Shop reviews & ratings" feed={query.data} loading={query.isLoading} />;
}
