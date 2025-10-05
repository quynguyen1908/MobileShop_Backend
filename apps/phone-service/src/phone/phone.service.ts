import { Inject, Injectable } from '@nestjs/common';
import type { IPhoneQueryRepository, IPhoneService } from './phone.port';
import {
  AppError,
  Paginated,
  PagingDto,
  PHONE_REPOSITORY,
} from '@app/contracts';
import {
  Category,
  CategoryDto,
  ErrBrandNotFound,
  ErrCategoryNotFound,
  ErrPhoneNotFound,
  ErrPhoneVariantNotFound,
  ErrVariantColorNotFound,
  ErrVariantPriceNotFound,
  Phone,
  PhoneDto,
  PhoneFilterDto,
  phoneFilterDtoSchema,
  PhoneVariant,
  VariantDto,
  VariantSpecificationDto,
} from '@app/contracts/phone';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PhoneService implements IPhoneService {
  constructor(
    @Inject(PHONE_REPOSITORY)
    private readonly phoneRepository: IPhoneQueryRepository,
  ) {}

  async getPhone(id: number): Promise<PhoneDto> {
    const phone = await this.phoneRepository.findPhoneById(id);
    if (!phone) {
      throw new RpcException(
        AppError.from(ErrPhoneNotFound, 404)
          .withLog('Phone not found')
          .toJson(false),
      );
    }
    if (typeof phone.id !== 'number') {
      throw new RpcException(
        AppError.from(ErrPhoneNotFound, 404)
          .withLog('Phone ID is invalid')
          .toJson(false),
      );
    }

    const brand = await this.phoneRepository.findBrandById(phone.brandId);
    if (!brand) {
      throw new RpcException(
        AppError.from(ErrBrandNotFound, 404)
          .withLog('Brand not found')
          .toJson(false),
      );
    }
    const category = await this.phoneRepository.findCategoryById(
      phone.categoryId,
    );
    if (!category) {
      throw new RpcException(
        AppError.from(ErrCategoryNotFound, 404)
          .withLog('Category not found')
          .toJson(false),
      );
    }

    const reviews = await this.phoneRepository.findReviewsByPhoneId(phone.id);

    const variants = await this.phoneRepository.findVariantsByPhoneId(phone.id);
    if (!variants || variants.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('No variants found for the phone')
          .toJson(false),
      );
    }

    const variantDtos = await this.toVariantsDto(variants);

    const phoneDto: PhoneDto = {
      id: phone.id,
      name: phone.name,
      description: phone.description,
      brand: { name: brand.name, id: brand.id },
      category: {
        name: category.name,
        id: category.id,
        parentId: category.parentId,
      },
      variants: variantDtos,
      reviews: reviews,
    };

    return phoneDto;
  }

  async getPhonesByIds(ids: number[]): Promise<Phone[]> {
    return this.phoneRepository.findPhoneByIds(ids);
  }

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

  async listPhones(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneDto>> {
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

    const phoneIds = [...new Set(paginatedVariants.data.map((v) => v.phoneId))];
    const phones = await this.phoneRepository.findPhoneByIds(phoneIds);

    const brands = await this.phoneRepository.findBrandsByIds(
      phones.map((p) => p.brandId),
    );
    const categories = await this.phoneRepository.findCategoriesByIds(
      phones.map((p) => p.categoryId),
    );
    const reviews = await this.phoneRepository.findReviewsByPhoneIds(phoneIds);

    const variantsDto = await this.toVariantsDto(paginatedVariants.data);

    const phoneDtos: PhoneDto[] = phones.map((phone) => {
      const brand = brands.find((b) => b.id === phone.brandId);
      if (!brand) {
        throw new RpcException(
          AppError.from(ErrBrandNotFound, 404)
            .withLog('Brand not found')
            .toJson(false),
        );
      }

      const category = categories.find((c) => c.id === phone.categoryId);
      if (!category) {
        throw new RpcException(
          AppError.from(ErrCategoryNotFound, 404)
            .withLog('Category not found')
            .toJson(false),
        );
      }

      const phoneReviews = reviews.filter((r) => r.phoneId === phone.id);

      return {
        id: phone.id,
        name: phone.name,
        description: phone.description,
        brand: { id: brand.id, name: brand.name },
        category: {
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        },
        variants: variantsDto.filter((v) => v.phoneId === phone.id),
        reviews: phoneReviews,
      } as PhoneDto;
    });

    return {
      data: phoneDtos,
      paging: paginatedVariants.paging,
      total: paginatedVariants.total,
    };
  }

  async getVariantsByIds(ids: number[]): Promise<VariantDto[]> {
    const variants = await this.phoneRepository.findVariantsByIds(ids);
    if (!variants || variants.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('No variants found for the given IDs')
          .toJson(false),
      );
    }

    const variantDtos = await this.toVariantsDto(variants);
    return variantDtos;
  }

  private async toVariantsDto(variants: PhoneVariant[]): Promise<VariantDto[]> {
    const variantIds = variants
      .map((v) => v.id)
      .filter((id): id is number => typeof id === 'number');
    const colors =
      await this.phoneRepository.findColorsByVariantIds(variantIds);
    const prices =
      await this.phoneRepository.findPricesByVariantIds(variantIds);
    const discounts =
      await this.phoneRepository.findDiscountsByVariantIds(variantIds);
    const images =
      await this.phoneRepository.findImagesByVariantIds(variantIds);
    const variantSpecifications =
      await this.phoneRepository.findSpecificationsByVariantIds(variantIds);
    const specificationIds = variantSpecifications.map((vs) => vs.specId);
    const specifications =
      await this.phoneRepository.findSpecificationByIds(specificationIds);

    const variantsDto: VariantDto[] = variants.map((variant) => {
      const color = colors.find((c) => c.id === variant.id);
      if (!color) {
        throw new RpcException(
          AppError.from(ErrVariantColorNotFound, 404)
            .withLog('Variant color not found')
            .toJson(false),
        );
      }

      const price = prices.find((p) => p.variantId === variant.id);
      if (!price) {
        throw new RpcException(
          AppError.from(ErrVariantPriceNotFound, 404)
            .withLog('Variant price not found')
            .toJson(false),
        );
      }

      const discount = discounts.find((d) => d.variantId === variant.id);
      const variantImages = images.filter((i) => i.variantId === variant.id);
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

      return {
        id: variant.id,
        phoneId: variant.phoneId,
        variantName: variant.variantName,
        color: { id: color.id, name: color.name },
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
        images: variantImages.map((img) => ({
          id: img.id,
          variantId: img.variantId,
          imageUrl: img.imageUrl,
        })),
        specifications: variantSpecificationDtos,
      } as VariantDto;
    });

    return variantsDto;
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
