import { Inject, Injectable } from '@nestjs/common';
import type { IPhoneRepository, IPhoneService } from './phone.port';
import {
  AppError,
  EVENT_PUBLISHER,
  Paginated,
  PagingDto,
  PHONE_REPOSITORY,
} from '@app/contracts';
import type { IEventPublisher } from '@app/contracts';
import {
  BrandDto,
  Category,
  CategoryDto,
  ErrBrandNotFound,
  ErrCategoryNotFound,
  ErrColorNotFound,
  ErrInventoryNotFound,
  ErrPhoneNotFound,
  ErrPhoneVariantNotFound,
  ErrVariantImagesNotFound,
  ErrVariantPriceNotFound,
  Image,
  Inventory,
  Phone,
  PhoneFilterDto,
  phoneFilterDtoSchema,
  PhoneVariant,
  PhoneVariantDto,
  InventoryUpdateDto,
  VariantColorDto,
  VariantImageDto,
  VariantSpecificationDto,
  BrandCreateDto,
  CategoryCreateDto,
  Color,
  Specification,
  PhoneCreateDto,
  brandCreateDtoSchema,
  categoryCreateDtoSchema,
  phoneCreateDtoSchema,
  PhoneVariantCreateDto,
  phoneVariantCreateDtoSchema,
  VariantColor,
  VariantImage,
  VariantSpecification,
  ErrSpecificationNotFound,
  PhoneCreatedEvent,
  PHONE_SERVICE_NAME,
  VariantCreatedEvent,
} from '@app/contracts/phone';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PhoneService implements IPhoneService {
  constructor(
    @Inject(PHONE_REPOSITORY)
    private readonly phoneRepository: IPhoneRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {}

  // Phone

  async getPhonesByIds(ids: number[]): Promise<Phone[]> {
    return this.phoneRepository.findPhoneByIds(ids);
  }

  async createPhone(phoneCreateDto: PhoneCreateDto): Promise<number> {
    const data = phoneCreateDtoSchema.parse(phoneCreateDto);

    const newPhone = await this.phoneRepository.insertPhone({
      name: data.name,
      brandId: data.brandId,
      categoryId: data.categoryId,
      isDeleted: false,
    });

    const variantCreateDto = data.variants;

    for (const variantDto of variantCreateDto) {
      await this.insertPhoneVariant(newPhone.id!, variantDto);
    }

    const event = PhoneCreatedEvent.create(
      {
        id: newPhone.id!,
        name: newPhone.name,
        brandId: newPhone.brandId,
        categoryId: newPhone.categoryId,
      },
      PHONE_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);

    return newPhone.id!;
  }

  // Brand

  async getAllBrands(): Promise<BrandDto[]> {
    const brands = await this.phoneRepository.findAllBrands();

    if (!brands || brands.length === 0) {
      throw new RpcException(
        AppError.from(ErrBrandNotFound, 404)
          .withLog('No brands found')
          .toJson(false),
      );
    }

    const imageIds = brands
      .map((b) => b.imageId)
      .filter((id): id is number => typeof id === 'number');
    const images = await this.phoneRepository.findImagesByIds(imageIds);

    const brandDtos: BrandDto[] = brands.map((brand) => {
      const image = images.find((img) => img.id === brand.imageId);
      return {
        id: brand.id,
        name: brand.name,
        image: {
          id: brand.imageId,
          imageUrl: image ? image.imageUrl : '',
        },
      };
    });

    return brandDtos;
  }

  async createBrand(brandCreateDto: BrandCreateDto): Promise<number> {
    const data = brandCreateDtoSchema.parse(brandCreateDto);

    const newImage = await this.phoneRepository.insertImage({
      imageUrl: data.imageUrl,
      isDeleted: false,
    });

    const newBrand = await this.phoneRepository.insertBrand({
      name: data.name,
      imageId: newImage.id,
      isDeleted: false,
    });
    return newBrand.id!;
  }

  // Category

  async getAllCategories(): Promise<CategoryDto[]> {
    const categories = await this.phoneRepository.findAllCategories();

    if (!categories || categories.length === 0) {
      throw new RpcException(
        AppError.from(ErrCategoryNotFound, 404)
          .withLog('No categories found')
          .toJson(false),
      );
    }

    const categoryTree = this.buildCategoryTree(categories);
    return categoryTree;
  }

  async createCategory(categoryCreateDto: CategoryCreateDto): Promise<number> {
    const data = categoryCreateDtoSchema.parse(categoryCreateDto);

    const newCategory = await this.phoneRepository.insertCategory({
      name: data.name,
      parentId: data.parentId,
      isDeleted: false,
    });
    return newCategory.id!;
  }

  // Color

  async getAllColors(): Promise<Color[]> {
    return this.phoneRepository.findAllColors();
  }

  async createColor(name: string): Promise<number> {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new RpcException(
        AppError.from(ErrColorNotFound, 400)
          .withLog('Color name cannot be empty')
          .toJson(false),
      );
    }
    const newColor = await this.phoneRepository.insertColor({
      name,
      isDeleted: false,
    });
    return newColor.id!;
  }

  // Phone Variant

  async getVariantById(id: number): Promise<PhoneVariantDto> {
    const variants = await this.phoneRepository.findVariantsById(id);
    if (!variants) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('Phone variant not found for the given ID')
          .toJson(false),
      );
    }

    const [variantDto] = await this.toPhoneVariantDto([variants]);

    return variantDto;
  }

  async getVariantsByIds(ids: number[]): Promise<PhoneVariantDto[]> {
    const variants = await this.phoneRepository.findVariantsByIds(ids);
    if (!variants || variants.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('No phone variants found for the given IDs')
          .toJson(false),
      );
    }

    const variantDtos = await this.toPhoneVariantDto(variants);

    return variantDtos;
  }

  async listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariantDto>> {
    const dto = phoneFilterDtoSchema.parse(filter);

    const paginatedVariants = await this.phoneRepository.listPhoneVariants(
      dto,
      paging,
    );

    if (!paginatedVariants.data || paginatedVariants.data.length === 0) {
      return {
        data: [],
        paging: paginatedVariants.paging,
        total: paginatedVariants.total,
      };
    }

    const variantDtos = await this.toPhoneVariantDto(paginatedVariants.data);

    return {
      data: variantDtos,
      paging: paginatedVariants.paging,
      total: paginatedVariants.total,
    };
  }

  async getRelatedVariants(variantId: number): Promise<PhoneVariantDto[]> {
    const variants = await this.phoneRepository.findVariantsById(variantId);
    if (!variants) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('Phone variant not found for the given ID')
          .toJson(false),
      );
    }

    const relatedVariants = await this.phoneRepository.findVariantsByPhoneId(
      variants.phoneId,
    );

    const relatedVariantDtos = await this.toPhoneVariantDto(relatedVariants);

    return relatedVariantDtos;
  }

  async createPhoneVariant(
    phoneId: number,
    phoneVariantCreateDto: PhoneVariantCreateDto,
  ): Promise<number> {
    const newVariant = await this.insertPhoneVariant(
      phoneId,
      phoneVariantCreateDto,
    );

    const event = VariantCreatedEvent.create(
      {
        id: newVariant.id!,
        phoneId: newVariant.phoneId,
        variantName: newVariant.variantName,
        description: newVariant.description ?? undefined,
      },
      PHONE_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);

    return newVariant.id!;
  }

  // Image

  async getImagesByIds(ids: number[]): Promise<Image[]> {
    const images = await this.phoneRepository.findImagesByIds(ids);
    if (!images || images.length === 0) {
      throw new RpcException(
        AppError.from(ErrVariantImagesNotFound, 404)
          .withLog('No images found for the given IDs')
          .toJson(false),
      );
    }
    return images;
  }

  // Specification

  async getAllSpecifications(): Promise<Specification[]> {
    return this.phoneRepository.findAllSpecifications();
  }

  async createSpecification(name: string): Promise<number> {
    if (!name || name.trim() === '') {
      throw new RpcException(
        AppError.from(ErrSpecificationNotFound, 400)
          .withLog('Specification name cannot be empty')
          .toJson(false),
      );
    }
    const newSpecification = await this.phoneRepository.insertSpecification({
      name,
      isDeleted: false,
    });
    return newSpecification.id!;
  }

  // Inventory

  async getInventoryBySku(sku: string): Promise<Inventory> {
    const inventory = await this.phoneRepository.findInventoryBySku(sku);
    if (!inventory) {
      throw new RpcException(
        AppError.from(ErrInventoryNotFound, 404)
          .withLog('No inventory found for the given SKU')
          .toJson(false),
      );
    }

    return inventory;
  }

  async getInventoryByVariantIdAndColorId(
    variantId: number,
    colorId: number,
  ): Promise<Inventory> {
    const inventory =
      await this.phoneRepository.findInventoryByVariantIdAndColorId(
        variantId,
        colorId,
      );
    if (!inventory) {
      throw new RpcException(
        AppError.from(ErrInventoryNotFound, 404)
          .withLog('No inventory found for the given variant and color')
          .toJson(false),
      );
    }
    return inventory;
  }

  async checkInventoryAvailability(
    variantId: number,
    colorId: number,
    requiredQuantity: number,
  ): Promise<boolean> {
    const inventory =
      await this.phoneRepository.findInventoryByVariantIdAndColorId(
        variantId,
        colorId,
      );
    if (!inventory) {
      throw new RpcException(
        AppError.from(ErrInventoryNotFound, 404)
          .withLog('No inventory found for the given variant and color')
          .toJson(false),
      );
    }

    return inventory.stockQuantity >= requiredQuantity;
  }

  async updateInventory(id: number, data: InventoryUpdateDto): Promise<void> {
    const inventory = await this.phoneRepository.findInventoryById(id);
    if (!inventory) {
      throw new RpcException(
        AppError.from(ErrInventoryNotFound, 404)
          .withLog('No inventory found for the given ID')
          .toJson(false),
      );
    }

    await this.phoneRepository.updateInventory(id, data);
  }

  private async toPhoneVariantDto(
    variants: PhoneVariant[],
  ): Promise<PhoneVariantDto[]> {
    const phoneIds = [...new Set(variants.map((v) => v.phoneId))];
    const phones = await this.phoneRepository.findPhoneByIds(phoneIds);

    const brands = await this.phoneRepository.findBrandsByIds(
      phones.map((p) => p.brandId),
    );

    const categories = await this.phoneRepository.findCategoriesByIds(
      phones.map((p) => p.categoryId),
    );

    const variantIds = variants
      .map((v) => v.id)
      .filter((id): id is number => typeof id === 'number');

    const variantColors =
      await this.phoneRepository.findVariantColorsByVariantIds(variantIds);
    const colors = await this.phoneRepository.findColorsByIds(
      variantColors.map((vc) => vc.colorId),
    );

    const prices =
      await this.phoneRepository.findPricesByVariantIds(variantIds);

    const discounts =
      await this.phoneRepository.findDiscountsByVariantIds(variantIds);

    const variantImages =
      await this.phoneRepository.findVariantImagesByVariantIds(variantIds);

    const allImageIds = [
      ...new Set([
        ...variantColors.map((vc) => vc.imageId),
        ...variantImages.map((vi) => vi.imageId),
        ...brands
          .map((b) => b.imageId)
          .filter((id): id is number => typeof id === 'number'),
      ]),
    ];

    const images = await this.phoneRepository.findImagesByIds(allImageIds);

    const variantSpecifications =
      await this.phoneRepository.findSpecificationsByVariantIds(variantIds);
    const specifications = await this.phoneRepository.findSpecificationByIds(
      variantSpecifications.map((vs) => vs.specId),
    );

    const reviews =
      await this.phoneRepository.findReviewsByVariantIds(variantIds);

    const inventories =
      await this.phoneRepository.findInventoriesByVariantIds(variantIds);

    const variantDtos: PhoneVariantDto[] = variants.map((variant) => {
      const phone = phones.find((p) => p.id === variant.phoneId);
      if (!phone) {
        throw new RpcException(
          AppError.from(ErrPhoneNotFound, 404)
            .withLog('Phone not found for variant')
            .toJson(false),
        );
      }

      const brand = brands.find((b) => b.id === phone.brandId);
      if (!brand) {
        throw new RpcException(
          AppError.from(ErrBrandNotFound, 404)
            .withLog('Brand not found for phone')
            .toJson(false),
        );
      }

      const brandDto: BrandDto = {
        id: brand.id,
        name: brand.name,
        image: {
          id: brand.imageId,
          imageUrl: (() => {
            const img = images.find((i) => i.id === brand.imageId);
            return img ? img.imageUrl : '';
          })(),
        },
      };

      const category = categories.find((c) => c.id === phone.categoryId);
      if (!category) {
        throw new RpcException(
          AppError.from(ErrCategoryNotFound, 404)
            .withLog('Category not found for phone')
            .toJson(false),
        );
      }

      const vc = variantColors.filter((vc) => vc.variantId === variant.id);
      const variantColorDtos: VariantColorDto[] = vc.map((vc) => {
        const c = colors.find((col) => col.id === vc.colorId);
        if (!c) {
          throw new RpcException(
            AppError.from(ErrColorNotFound, 404)
              .withLog('Color not found for variant color')
              .toJson(false),
          );
        }
        return {
          variantId: vc.variantId,
          imageId: vc.imageId,
          color: { id: c.id, name: c.name },
        };
      });

      const price = prices.find((p) => p.variantId === variant.id);
      if (!price) {
        throw new RpcException(
          AppError.from(ErrVariantPriceNotFound, 404)
            .withLog('Variant price not found')
            .toJson(false),
        );
      }

      const discount = discounts.find((d) => d.variantId === variant.id);

      const vi = variantImages.filter((vi) => vi.variantId === variant.id);
      const variantImageDtos: VariantImageDto[] = vi.map((vi) => {
        const img = images.find((i) => i.id === vi.imageId);
        if (!img) {
          throw new RpcException(
            AppError.from(ErrVariantImagesNotFound, 404)
              .withLog('Image not found for variant image')
              .toJson(false),
          );
        }
        return {
          id: vi.id,
          variantId: vi.variantId,
          image: { id: img.id, imageUrl: img.imageUrl },
        };
      });

      const variantSpecs = variantSpecifications.filter(
        (vs) => vs.variantId === variant.id,
      );
      const variantSpecificationDtos: VariantSpecificationDto[] =
        variantSpecs.map((vs) => {
          const spec = specifications.find((s) => s.id === vs.specId);
          return {
            info: vs.info,
            specification: {
              name: spec ? spec.name : '',
            },
          };
        });

      const variantReviews = reviews.filter((r) => r.variantId === variant.id);

      const variantInventories = inventories.filter(
        (inv) => inv.variantId === variant.id,
      );

      const averageRating =
        variantReviews.length > 0
          ? variantReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
            variantReviews.length
          : 0;

      return {
        id: variant.id,
        variantName: variant.variantName,
        description: variant.description,
        phone: {
          id: phone.id,
          name: phone.name,
          brand: brandDto,
          category: {
            id: category.id,
            name: category.name,
            parentId: category.parentId,
          },
        },
        colors: variantColorDtos,
        price: {
          id: price.id,
          variantId: price.variantId,
          price: price.price,
          startDate: price.startDate,
          endDate: price.endDate,
        },
        discount: discount
          ? {
              id: discount.id,
              variantId: discount.variantId,
              discountPercent: discount.discountPercent,
              startDate: discount.startDate,
              endDate: discount.endDate,
            }
          : undefined,
        images: variantImageDtos,
        specifications: variantSpecificationDtos,
        reviews: variantReviews,
        averageRating: averageRating,
        inventories: variantInventories,
      } as PhoneVariantDto;
    });

    return variantDtos;
  }

  private async insertPhoneVariant(
    phoneId: number,
    phoneVariantCreateDto: PhoneVariantCreateDto,
  ): Promise<PhoneVariant> {
    const data = phoneVariantCreateDtoSchema.parse(phoneVariantCreateDto);

    const newVariant = await this.phoneRepository.insertPhoneVariant({
      phoneId,
      variantName: data.variantName,
      description: data.description,
      isDeleted: false,
    });

    const variantColors: VariantColor[] = [];
    const variantImages: VariantImage[] = [];

    for (const colorDto of data.colors) {
      const newImage = await this.phoneRepository.insertImage({
        imageUrl: colorDto.imageUrl,
        isDeleted: false,
      });

      variantColors.push({
        variantId: newVariant.id!,
        colorId: colorDto.colorId,
        imageId: newImage.id!,
        isDeleted: false,
      });

      variantImages.push({
        variantId: newVariant.id!,
        imageId: newImage.id!,
        isDeleted: false,
      });
    }

    await this.phoneRepository.insertVariantColors(variantColors);

    await this.phoneRepository.insertVariantPrice({
      variantId: newVariant.id!,
      price: data.price,
      startDate: new Date(),
      endDate: null,
      isDeleted: false,
    });

    if (data.discountPercent) {
      await this.phoneRepository.insertVariantDiscount({
        variantId: newVariant.id!,
        discountPercent: data.discountPercent,
        startDate: new Date(),
        endDate: null,
        isDeleted: false,
      });
    }

    if (data.images && data.images.length > 0) {
      for (const imageUrl of data.images) {
        const newImage = await this.phoneRepository.insertImage({
          imageUrl,
          isDeleted: false,
        });
        variantImages.push({
          variantId: newVariant.id!,
          imageId: newImage.id!,
          isDeleted: false,
        });
      }
    }

    await this.phoneRepository.insertVariantImages(variantImages);

    const variantSpecification: VariantSpecification[] = [];
    for (const specDto of data.specifications) {
      if (specDto.unit) {
        variantSpecification.push({
          variantId: newVariant.id!,
          specId: specDto.specId,
          info: specDto.info + ' ' + specDto.unit,
          unit: specDto.unit,
          valueNumeric: parseFloat(specDto.info),
          isDeleted: false,
        });
      } else {
        variantSpecification.push({
          variantId: newVariant.id!,
          specId: specDto.specId,
          info: specDto.info,
          isDeleted: false,
        });
      }
    }

    await this.phoneRepository.insertVariantSpecifications(
      variantSpecification,
    );

    return newVariant;
  }

  private buildCategoryTree(categories: Category[]): CategoryDto[] {
    const categoryMap = new Map<number, CategoryDto>();

    categories.forEach((category) => {
      if (typeof category.id === 'number') {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          parentId: category.parentId,
          children: [],
        });
      }
    });

    const rootCategories: CategoryDto[] = [];

    categoryMap.forEach((category) => {
      if (category.parentId) {
        const parentCategory = categoryMap.get(category.parentId);
        if (parentCategory) {
          parentCategory.children = parentCategory.children || [];
          parentCategory.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }
}
