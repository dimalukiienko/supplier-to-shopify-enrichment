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

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionCard } from "@/components/SectionCard";

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
        <div
          className="flex min-h-[61px] items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
          key={index}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              className="h-4"
              style={{ width: index % 2 === 0 ? "220px" : "170px" }}
            />
            <Skeleton
              className="h-3"
              style={{ width: index % 2 === 0 ? "130px" : "95px" }}
            />
          </div>
          {showBadge && <Skeleton className="h-6 w-23 rounded-full" />}
        </div>
      ))}
    </>
  );
}

function SkeletonField({ lines = 1 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2 not-first:mt-4 not-first:border-t not-first:pt-4">
      <Skeleton className="h-3 w-23" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          className="h-4"
          key={index}
          style={{ width: index === lines - 1 ? "72%" : "100%" }}
        />
      ))}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-23" />
        <span className="flex-1" />
        <Skeleton className="size-[30px] rounded-md" />
        <Skeleton className="size-[30px] rounded-md" />
      </div>
    </div>
  );
}

export function BatchesPageSkeleton() {
  return (
    <main aria-label="Loading batches">
      <Skeleton className="mb-4 h-7 w-27" />

      <Card className="mb-4 gap-3 p-4">
        <Skeleton className="h-5 w-44" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 min-w-45 flex-1" />
          <Skeleton className="h-9 w-28" />
        </div>
      </Card>

      <Card className="px-4 py-0">
        <SkeletonRows count={5} />
      </Card>
    </main>
  );
}

export function BatchProductsPageSkeleton() {
  return (
    <main aria-label="Loading batch products">
      <Skeleton className="h-4 w-22" />
      <Skeleton className="my-4 h-7 w-42" />
      <Skeleton className="h-4 w-78" />

      <Card className="my-4 flex flex-row items-center gap-3 p-4">
        <Skeleton className="h-4 w-42" />
        <Skeleton className="h-6 w-23 rounded-full" />
      </Card>

      <Card className="px-4 py-0">
        <SkeletonRows count={6} />
      </Card>
    </main>
  );
}

export function SettingsPageSkeleton() {
  return (
    <main aria-label="Loading settings">
      <Skeleton className="mb-4 h-7 w-28" />

      <Card className="mb-4 p-4">
        <SkeletonField />
        <SkeletonField />
        <SkeletonField lines={2} />
      </Card>

      <Skeleton className="mb-3 h-5 w-30" />
      <Card className="px-4 py-0">
        <SkeletonRows count={3} showBadge={false} />
      </Card>
    </main>
  );
}

export function ProductReviewPageSkeleton() {
  return (
    <div aria-label="Loading product review">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5">
        <Skeleton className="h-4 w-18" />
        <Skeleton className="size-[30px] rounded-md" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-[30px] rounded-md" />
        <Skeleton className="h-4 w-45" />
      </nav>

      <div className="mb-2 flex items-center gap-3">
        <Skeleton className="h-7 w-70" />
        <Skeleton className="h-6 w-23 rounded-full" />
        <span className="flex-1" />
        <Skeleton className="size-[30px] rounded-md" />
        <Skeleton className="size-[30px] rounded-md" />
      </div>

      <Card className="mb-4 flex flex-row flex-wrap items-start gap-3.5 p-4">
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-lg">
          <Package className="size-5" />
        </span>
        <div className="min-w-50 flex-1">
          <Skeleton className="mb-2 h-3 w-29" />
          <Skeleton className="h-4 w-60" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-30 rounded-md" />
            <Skeleton className="h-6 w-30 rounded-md" />
            <Skeleton className="h-6 w-30 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard icon={<FileText />} title="Description">
            <SkeletonField lines={3} />
          </SectionCard>
          <SectionCard icon={<Store />} title="Vendor">
            <SkeletonField />
          </SectionCard>
          <SectionCard icon={<Tag />} title="Product Type">
            <SkeletonField />
          </SectionCard>
          <SectionCard icon={<Tags />} title="Tags" count={4}>
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-30 rounded-md" />
              <Skeleton className="h-6 w-30 rounded-md" />
              <Skeleton className="h-6 w-30 rounded-md" />
            </div>
          </SectionCard>
          <SectionCard icon={<Search />} title="Search Engine Listing">
            <SkeletonField />
            <SkeletonField lines={2} />
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard icon={<ImageOff />} title="Product Media">
            <Skeleton className="flex aspect-square items-center justify-center rounded-lg">
              <ImageOff className="text-muted-foreground size-7" />
            </Skeleton>
            <div className="mt-2.5 flex gap-2">
              <Skeleton className="size-12 rounded-md" />
              <Skeleton className="size-12 rounded-md" />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4">
        <SectionCard icon={<Ruler />} title="Physical Attributes">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-4 gap-y-2">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard icon={<Boxes />} title="Product Variants" count={3}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="size-9 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-22" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-19" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Skeleton className="h-7 w-16" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}
