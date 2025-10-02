-- CreateTable
CREATE TABLE "public"."brands" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."phones" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."colors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."phone_variants" (
    "id" SERIAL NOT NULL,
    "phone_id" INTEGER NOT NULL,
    "variantName" VARCHAR(100) NOT NULL,
    "color_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "phone_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant_prices" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "variant_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant_discounts" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "variant_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant_images" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "imageUrl" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "variant_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."specifications" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."variant_specifications" (
    "variant_id" INTEGER NOT NULL,
    "spec_id" INTEGER NOT NULL,
    "info" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "variant_specifications_pkey" PRIMARY KEY ("variant_id","spec_id")
);

-- CreateTable
CREATE TABLE "public"."inventories" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "phone_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phones_brand_id_idx" ON "public"."phones"("brand_id");

-- CreateIndex
CREATE INDEX "phones_category_id_idx" ON "public"."phones"("category_id");

-- CreateIndex
CREATE INDEX "phone_variants_phone_id_idx" ON "public"."phone_variants"("phone_id");

-- CreateIndex
CREATE INDEX "phone_variants_color_id_idx" ON "public"."phone_variants"("color_id");

-- CreateIndex
CREATE INDEX "variant_prices_variant_id_idx" ON "public"."variant_prices"("variant_id");

-- CreateIndex
CREATE INDEX "variant_discounts_variant_id_idx" ON "public"."variant_discounts"("variant_id");

-- CreateIndex
CREATE INDEX "variant_images_variant_id_idx" ON "public"."variant_images"("variant_id");

-- CreateIndex
CREATE INDEX "inventories_variant_id_idx" ON "public"."inventories"("variant_id");

-- CreateIndex
CREATE INDEX "reviews_order_id_idx" ON "public"."reviews"("order_id");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "public"."reviews"("customer_id");

-- CreateIndex
CREATE INDEX "reviews_phone_id_idx" ON "public"."reviews"("phone_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_customer_id_order_id_phone_id_key" ON "public"."reviews"("customer_id", "order_id", "phone_id");

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phones" ADD CONSTRAINT "phones_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phones" ADD CONSTRAINT "phones_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_variants" ADD CONSTRAINT "phone_variants_phone_id_fkey" FOREIGN KEY ("phone_id") REFERENCES "public"."phones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_variants" ADD CONSTRAINT "phone_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant_prices" ADD CONSTRAINT "variant_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant_discounts" ADD CONSTRAINT "variant_discounts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant_images" ADD CONSTRAINT "variant_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant_specifications" ADD CONSTRAINT "variant_specifications_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."variant_specifications" ADD CONSTRAINT "variant_specifications_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "public"."specifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventories" ADD CONSTRAINT "inventories_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_phone_id_fkey" FOREIGN KEY ("phone_id") REFERENCES "public"."phones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
