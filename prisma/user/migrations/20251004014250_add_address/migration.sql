-- CreateTable
CREATE TABLE "public"."provinces" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "division_type" VARCHAR(50) NOT NULL,
    "codename" VARCHAR(100) NOT NULL,
    "phone_code" INTEGER NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."communes" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "division_type" VARCHAR(50) NOT NULL,
    "codename" VARCHAR(100) NOT NULL,
    "province_code" INTEGER NOT NULL,

    CONSTRAINT "communes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."addresses" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_phone" VARCHAR(50) NOT NULL,
    "street" VARCHAR(255) NOT NULL,
    "commune_id" INTEGER NOT NULL,
    "province_id" INTEGER NOT NULL,
    "postal_code" VARCHAR(20),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "public"."provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "communes_code_key" ON "public"."communes"("code");

-- CreateIndex
CREATE INDEX "addresses_customer_id_idx" ON "public"."addresses"("customer_id");

-- CreateIndex
CREATE INDEX "addresses_commune_id_idx" ON "public"."addresses"("commune_id");

-- CreateIndex
CREATE INDEX "addresses_province_id_idx" ON "public"."addresses"("province_id");

-- AddForeignKey
ALTER TABLE "public"."communes" ADD CONSTRAINT "communes_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
