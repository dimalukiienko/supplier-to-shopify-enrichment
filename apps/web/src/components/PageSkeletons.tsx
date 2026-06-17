import {
  Boxes,
  FileText,
  ImageOff,
  Package,
  Ruler,
  Search,
  Store,
  Tag,
  Tags,
} from "lucide-react";
import { SectionCard } from "@/components/SectionCard";

function SkeletonBlock({
  className = "",
  width,
}: {
  className?: string;
  width?: string;
}) {
  return (
    <span
      className={`skeleton-block ${className}`}
      style={width ? { width } : undefined}
    />
  );
}

function SkeletonRows({
  count,
  showBadge = true,
}: {
  count: number;
  showBadge?: boolean;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div className="row skeleton-row" key={index}>
          <div className="skeleton-row-copy">
            <SkeletonBlock
              className="skeleton-line"
              width={index % 2 === 0 ? "220px" : "170px"}
            />
            <SkeletonBlock
              className="skeleton-line short"
              width={index % 2 === 0 ? "130px" : "95px"}
            />
          </div>
          {showBadge && <SkeletonBlock className="skeleton-badge" />}
        </div>
      ))}
    </>
  );
}

function SkeletonField({ lines = 1 }: { lines?: number }) {
  return (
    <div className="skeleton-field">
      <SkeletonBlock className="skeleton-line label" width="92px" />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          className="skeleton-line"
          key={index}
          width={index === lines - 1 ? "72%" : "100%"}
        />
      ))}
      <div className="field-meta">
        <SkeletonBlock className="skeleton-line short" width="92px" />
        <span className="spacer" />
        <SkeletonBlock className="skeleton-icon" />
        <SkeletonBlock className="skeleton-icon" />
      </div>
    </div>
  );
}

export function BatchesPageSkeleton() {
  return (
    <main className="page-skeleton" aria-label="Loading batches">
      <SkeletonBlock className="skeleton-title" width="108px" />

      <div className="panel">
        <SkeletonBlock className="skeleton-heading" width="172px" />
        <div className="upload-skeleton-grid">
          <SkeletonBlock className="skeleton-input" />
          <SkeletonBlock className="skeleton-button" />
        </div>
      </div>

      <div className="panel">
        <SkeletonRows count={5} />
      </div>
    </main>
  );
}

export function BatchProductsPageSkeleton() {
  return (
    <main className="page-skeleton" aria-label="Loading batch products">
      <SkeletonBlock className="skeleton-link" width="88px" />
      <SkeletonBlock className="skeleton-title" width="168px" />
      <SkeletonBlock className="skeleton-line" width="310px" />

      <div className="panel live-skeleton">
        <SkeletonBlock className="skeleton-line" width="170px" />
        <SkeletonBlock className="skeleton-badge" />
      </div>

      <div className="panel">
        <SkeletonRows count={6} />
      </div>
    </main>
  );
}

export function SettingsPageSkeleton() {
  return (
    <main className="page-skeleton" aria-label="Loading settings">
      <SkeletonBlock className="skeleton-title" width="112px" />

      <div className="panel settings-skeleton">
        <SkeletonField />
        <SkeletonField />
        <SkeletonField lines={2} />
      </div>

      <SkeletonBlock className="skeleton-heading" width="118px" />
      <div className="panel">
        <SkeletonRows count={3} showBadge={false} />
      </div>
    </main>
  );
}

export function ProductReviewPageSkeleton() {
  return (
    <div className="page-skeleton" aria-label="Loading product review">
      <nav className="breadcrumb">
        <SkeletonBlock className="skeleton-link" width="70px" />
        <SkeletonBlock className="skeleton-icon" />
        <SkeletonBlock className="skeleton-link" width="130px" />
        <SkeletonBlock className="skeleton-icon" />
        <SkeletonBlock className="skeleton-link" width="180px" />
      </nav>

      <div className="page-header">
        <SkeletonBlock className="skeleton-title" width="280px" />
        <SkeletonBlock className="skeleton-badge" />
        <span className="spacer" />
        <SkeletonBlock className="skeleton-icon" />
        <SkeletonBlock className="skeleton-icon" />
      </div>

      <div className="panel parent-card">
        <span className="parent-thumb">
          <Package size={20} />
        </span>
        <div className="parent-meta">
          <SkeletonBlock className="skeleton-line short" width="116px" />
          <SkeletonBlock className="skeleton-line" width="240px" />
          <div className="parent-chips">
            <SkeletonBlock className="skeleton-chip" />
            <SkeletonBlock className="skeleton-chip" />
            <SkeletonBlock className="skeleton-chip" />
          </div>
        </div>
        <div className="actions">
          <SkeletonBlock className="skeleton-button" />
          <SkeletonBlock className="skeleton-button" />
        </div>
      </div>

      <div className="review-grid">
        <div className="review-col">
          <SectionCard icon={<FileText size={15} />} title="Description">
            <SkeletonField lines={3} />
          </SectionCard>
          <SectionCard icon={<Store size={15} />} title="Vendor">
            <SkeletonField />
          </SectionCard>
          <SectionCard icon={<Tag size={15} />} title="Product Type">
            <SkeletonField />
          </SectionCard>
          <SectionCard icon={<Tags size={15} />} title="Tags" count={4}>
            <div className="chip-row">
              <SkeletonBlock className="skeleton-chip" />
              <SkeletonBlock className="skeleton-chip" />
              <SkeletonBlock className="skeleton-chip" />
            </div>
          </SectionCard>
          <SectionCard
            icon={<Search size={15} />}
            title="Search Engine Listing"
          >
            <SkeletonField />
            <SkeletonField lines={2} />
          </SectionCard>
        </div>

        <div className="review-col">
          <SectionCard icon={<ImageOff size={15} />} title="Product Media">
            <div className="media-main skeleton-media">
              <ImageOff size={28} />
            </div>
            <div className="media-thumbs">
              <SkeletonBlock className="media-thumb" />
              <SkeletonBlock className="media-thumb" />
            </div>
          </SectionCard>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionCard icon={<Ruler size={15} />} title="Physical Attributes">
          <div className="attr-grid">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
        </SectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionCard
          icon={<Boxes size={15} />}
          title="Product Variants"
          count={3}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="skeleton-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index}>
                    <td>
                      <SkeletonBlock className="media-thumb" />
                    </td>
                    <td>
                      <SkeletonBlock className="skeleton-line" width="86px" />
                    </td>
                    <td>
                      <SkeletonBlock className="skeleton-line" width="190px" />
                    </td>
                    <td>
                      <SkeletonBlock className="skeleton-line" width="54px" />
                    </td>
                    <td>
                      <SkeletonBlock className="skeleton-line" width="24px" />
                    </td>
                    <td>
                      <SkeletonBlock className="skeleton-line" width="74px" />
                    </td>
                    <td>
                      <div className="actions">
                        <SkeletonBlock className="skeleton-button small" />
                        <SkeletonBlock className="skeleton-button small" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
