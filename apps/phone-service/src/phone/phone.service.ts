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
  CategoryUpdateDto,
  PhoneVariantUpdateDto,
  ErrVariantColorNotFound,
  ErrVariantDiscountNotFound,
  PhoneUpdateDto,
  PhoneUpdatedEvent,
  BrandUpdatedEvent,
  CategoryUpdatedEvent,
  PhoneVariantUpdatedEvent,
  PhoneWithVariantsDto,
} from '@app/contracts/phone';
import { RpcException } from '@nestjs/microservices';
import { parseFloatSafe } from '@app/contracts/utils';

@Injectable()
export class PhoneService implements IPhoneService {
  constructor(
    @Inject(PHONE_REPOSITORY)
    private readonly phoneRepository: IPhoneRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {}

  // Phone

  async getPhonesByIds(ids: number[]): Promise<Phone[]> {
    return this.phoneRepository.findPhonesByIds(ids);
  }

  async listPhones(
    paging: PagingDto,
  ): Promise<Paginated<PhoneWithVariantsDto>> {
    const paginatedPhones = await this.phoneRepository.listPhones(paging);

    if (!paginatedPhones.data || paginatedPhones.data.length === 0) {
      return {
        data: [],
        paging: paginatedPhones.paging,
        total: paginatedPhones.total,
      };
    }

    const brands = await this.phoneRepository.findBrandsByIds(
      paginatedPhones.data.map((p) => p.brandId),
    );

    const categories = await this.phoneRepository.findCategoriesByIds(
      paginatedPhones.data.map((p) => p.categoryId),
    );

    const imageIds = brands
      .map((b) => b.imageId)
      .filter((id): id is number => typeof id === 'number');

    const images = await this.phoneRepository.findImagesByIds(imageIds);

    const variants = await this.phoneRepository.findVariantsByPhoneIds(
      paginatedPhones.data
        .map((p) => p.id)
        .filter((id): id is number => typeof id === 'number'),
    );

    const variantDtos =
      variants.length > 0 ? await this.toPhoneVariantDto(variants) : [];

    const phoneDtos: PhoneWithVariantsDto[] = paginatedPhones.data.map(
      (phone) => {
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

        const phoneVariantDtos = variantDtos
          .filter((variant) => variant.phone?.id === phone.id)
          .map(
            ({ phone: _phone, ...variantWithoutPhone }) => variantWithoutPhone,
          );

        return {
          id: phone.id,
          name: phone.name,
          brand: brandDto,
          category: {
            id: category.id,
            name: category.name,
            parentId: category.parentId,
          },
          variants: phoneVariantDtos,
          createdAt: phone.createdAt,
          updatedAt: phone.updatedAt,
          isDeleted: phone.isDeleted,
        } as PhoneWithVariantsDto;
      },
    );

    return {
      data: phoneDtos,
      paging: paginatedPhones.paging,
      total: paginatedPhones.total,
    };
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

  async updatePhone(id: number, data: PhoneUpdateDto): Promise<void> {
    const phone = await this.phoneRepository.findPhonesByIds([id]);
    if (!phone || phone.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneNotFound, 404)
          .withLog('Phone not found for the given ID')
          .toJson(false),
      );
    }

    await this.phoneRepository.updatePhone(id, data);

    const event = PhoneUpdatedEvent.create(
      {
        id: id,
      },
      PHONE_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);
  }

  async deletePhonesByIds(ids: number[]): Promise<void> {
    const phones = await this.phoneRepository.findPhonesByIds(ids);
    if (!phones || phones.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneNotFound, 404)
          .withLog('Phones not found for the given IDs')
          .toJson(false),
      );
    }

    await this.deletePhones(ids);

    const event = PhoneUpdatedEvent.create(
      {
        id: ids[0],
      },
      PHONE_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);
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
      // Ensure the object literal is properly formatted
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

  async updateBrand(
    id: number,
    name?: string,
    imageUrl?: string,
  ): Promise<void> {
    const brand = await this.phoneRepository.findBrandsByIds([id]);
    if (!brand || brand.length === 0) {
      throw new RpcException(
        AppError.from(ErrBrandNotFound, 404)
          .withLog('Brand not found for the given ID')
          .toJson(false),
      );
    }

    if (imageUrl) {
      const newImage = await this.phoneRepository.insertImage({
        imageUrl,
        isDeleted: false,
      });

      if (typeof brand[0].imageId === 'number') {
        await this.phoneRepository.deleteImage(brand[0].imageId);
      }

      if (name) {
        await this.phoneRepository.updateBrand(id, {
          name,
          imageId: newImage.id,
          updatedAt: new Date(),
        });
      } else {
        await this.phoneRepository.updateBrand(id, {
          imageId: newImage.id,
          updatedAt: new Date(),
        });
      }
    } else {
      if (name) {
        await this.phoneRepository.updateBrand(id, {
          name,
          updatedAt: new Date(),
        });
      } else {
        throw new RpcException(
          AppError.from(ErrBrandNotFound, 400)
            .withLog('No update data provided for the brand')
            .toJson(false),
        );
      }
    }

    const event = BrandUpdatedEvent.create(
      {
        id: id,
      },
      PHONE_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);
  }

  async deleteBrand(id: number): Promise<void> {
    const brand = await this.phoneRepository.findBrandsByIds([id]);
    if (!brand || brand.length === 0) {
      throw new RpcException(
        AppError.from(ErrBrandNotFound, 404)
          .withLog('Brand not found for the given ID')
          .toJson(false),
      );
    }

    const phones = await this.phoneRepository.findPhonesByBrandId(id);
    if (phones && phones.length > 0) {
      await this.deletePhones(
        phones
          .map((phone) => phone.id)
          .filter((id): id is number => id !== undefined),
      );

      const event = BrandUpdatedEvent.create(
        {
          id: id,
        },
        PHONE_SERVICE_NAME,
      );

      await this.eventPublisher.publish(event);
    }

    await this.phoneRepository.softDeleteImagesByIds(
      brand
        .map((b) => b.imageId)
        .filter((id): id is number => typeof id === 'number'),
    );

    await this.phoneRepository.softDeleteBrand(id);
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

  async getCategoriesByIds(ids: number[]): Promise<Category[]> {
    return this.phoneRepository.findCategoriesByIds(ids);
  }

  async getParentCategoryIdsByVariantIds(
    variantIds: number[],
  ): Promise<number[]> {
    const variants = await this.phoneRepository.findVariantsByIds(variantIds);

    const phoneIds = variants.map((variant) => variant.phoneId);
    const phones = await this.phoneRepository.findPhonesByIds(phoneIds);

    const parentCategoryIds = new Set<number>();
    for (const phone of phones) {
      const categoryId = phone.categoryId;
      const parentIds =
        await this.phoneRepository.findAllParentCategoryIds(categoryId);
      parentIds.forEach((id) => parentCategoryIds.add(id));
    }
    return Array.from(parentCategoryIds);
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

  async updateCategory(id: number, data: CategoryUpdateDto): Promise<void> {
    const category = await this.phoneRepository.findCategoriesByIds([id]);
    if (!category || category.length === 0) {
      throw new RpcException(
        AppError.from(ErrCategoryNotFound, 404)
          .withLog('Category not found for the given ID')
          .toJson(false),
      );
    }

    await this.phoneRepository.updateCategory(id, {
      name: data.name,
      parentId: data.parentId,
      updatedAt: new Date(),
    });

    const phones = await this.phoneRepository.findPhonesByCategoryId(id);
    if (phones && phones.length > 0) {
      const event = CategoryUpdatedEvent.create(
        {
          id: id,
        },
        PHONE_SERVICE_NAME,
      );

      await this.eventPublisher.publish(event);
    }
  }

  async deleteCategory(id: number): Promise<void> {
    const category = await this.phoneRepository.findCategoriesByIds([id]);
    if (!category || category.length === 0) {
      throw new RpcException(
        AppError.from(ErrCategoryNotFound, 404)
          .withLog('Category not found for the given ID')
          .toJson(false),
      );
    }

    const childCategoryIds =
      await this.phoneRepository.findAllChildCategoryIds(id);
    const categoryIdsToDelete = [id, ...childCategoryIds];

    const phones =
      await this.phoneRepository.findPhonesByCategoryIds(categoryIdsToDelete);

    if (phones && phones.length > 0) {
      await this.deletePhones(
        phones
          .map((phone) => phone.id)
          .filter((id): id is number => id !== undefined),
      );

      const event = CategoryUpdatedEvent.create(
        {
          id: id,
        },
        PHONE_SERVICE_NAME,
      );

      await this.eventPublisher.publish(event);
    }

    await this.phoneRepository.softDeleteCategoriesByIds(categoryIdsToDelete);
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

  async updatePhoneVariant(
    id: number,
    data: PhoneVariantUpdateDto,
  ): Promise<void> {
    const variant = await this.phoneRepository.findVariantsById(id);
    if (!variant) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('Phone variant not found for the given ID')
          .toJson(false),
      );
    }

    let isOnlyUpdateImages = true;

    if (
      data.variantName !== undefined ||
      data.description !== undefined ||
      data.price !== undefined ||
      data.discount !== undefined
    ) {
      isOnlyUpdateImages = false;
    }

    await this.phoneRepository.updatePhoneVariant(id, {
      variantName: data.variantName,
      description: data.description,
      updatedAt: new Date(),
      isDeleted: data.isDeleted,
    });

    const deletedImageIds: Set<number> = new Set();
    const colorImageIds: Set<number> = new Set();
    const variantImageIds: Set<number> = new Set();

    const existingVariantColors =
      await this.phoneRepository.findVariantColorsByVariantIds([variant.id!]);
    const existingVariantImages =
      await this.phoneRepository.findVariantImagesByVariantIds([variant.id!]);

    existingVariantColors.forEach((color) => colorImageIds.add(color.imageId));
    existingVariantImages.forEach((img) => variantImageIds.add(img.imageId));

    if (data.colors) {
      for (const colorDto of data.colors) {
        const existingVariantColor = existingVariantColors.find(
          (color) => color.colorId === colorDto.colorId,
        );

        if (!existingVariantColor) {
          isOnlyUpdateImages = false;

          if (colorDto.imageUrl) {
            const newImage = await this.phoneRepository.insertImage({
              imageUrl: colorDto.imageUrl,
              isDeleted: false,
            });

            await this.phoneRepository.insertVariantColors([
              {
                variantId: variant.id!,
                colorId: colorDto.colorId,
                imageId: newImage.id!,
                isDeleted: false,
              },
            ]);

            await this.phoneRepository.insertVariantImages([
              {
                variantId: variant.id!,
                imageId: newImage.id!,
                isDeleted: false,
              },
            ]);

            colorImageIds.add(newImage.id!);
            variantImageIds.add(newImage.id!);
          } else {
            throw new RpcException(
              AppError.from(ErrVariantColorNotFound, 404)
                .withLog('Image not found for the given color')
                .toJson(false),
            );
          }
        } else {
          if (colorDto.isDeleted === true) {
            isOnlyUpdateImages = false;

            const imageIdToDelete = existingVariantColor.imageId;
            deletedImageIds.add(imageIdToDelete);
            colorImageIds.delete(imageIdToDelete);

            await this.phoneRepository.deleteVariantColorByVariantIdAndColorId(
              variant.id!,
              colorDto.colorId,
            );

            const imageInVariantImage = existingVariantImages.find(
              (img) => img.imageId === imageIdToDelete,
            );
            if (imageInVariantImage) {
              await this.phoneRepository.deleteVariantImage(
                imageInVariantImage.id!,
              );
              variantImageIds.delete(imageIdToDelete);
            }
          } else if (colorDto.imageUrl) {
            const oldImageId = existingVariantColor.imageId;
            deletedImageIds.add(oldImageId);
            colorImageIds.delete(oldImageId);

            const newImage = await this.phoneRepository.insertImage({
              imageUrl: colorDto.imageUrl,
              isDeleted: false,
            });

            if (colorDto.newColorId) isOnlyUpdateImages = false;

            await this.phoneRepository.updateVariantColorByVariantIdAndColorId(
              variant.id!,
              colorDto.colorId,
              {
                colorId: colorDto.newColorId,
                imageId: newImage.id!,
                updatedAt: new Date(),
                isDeleted: false,
              },
            );

            const imageInVariantImage = existingVariantImages.find(
              (img) => img.imageId === oldImageId,
            );
            if (imageInVariantImage) {
              await this.phoneRepository.updateVariantImage(
                imageInVariantImage.id!,
                newImage.id!,
              );
            } else {
              await this.phoneRepository.insertVariantImages([
                {
                  variantId: variant.id!,
                  imageId: newImage.id!,
                  isDeleted: false,
                },
              ]);
            }

            colorImageIds.add(newImage.id!);
            variantImageIds.add(newImage.id!);
            variantImageIds.delete(oldImageId);
          }
        }
      }
    }

    if (data.price !== undefined) {
      const price = await this.phoneRepository.findPricesByVariantIds([
        variant.id!,
      ]);
      if (!price) {
        throw new RpcException(
          AppError.from(ErrVariantPriceNotFound, 404)
            .withLog('No price found for the given variant')
            .toJson(false),
        );
      }

      const latestPrice = price.find((p) => p.endDate == null);
      if (!latestPrice) {
        throw new RpcException(
          AppError.from(ErrVariantPriceNotFound, 404)
            .withLog('No active price found for the given variant')
            .toJson(false),
        );
      }

      await this.phoneRepository.updateVariantPrice(latestPrice.id!, {
        endDate: new Date(),
        updatedAt: new Date(),
      });

      await this.phoneRepository.insertVariantPrice({
        variantId: variant.id!,
        price: data.price ?? 0,
        startDate: new Date(),
        endDate: null,
        isDeleted: false,
      });
    }

    if (data.discount !== undefined) {
      const discount = await this.phoneRepository.findDiscountsByVariantIds([
        variant.id!,
      ]);
      const latestDiscount = discount.find((d) => d.endDate == null);
      if (!latestDiscount) {
        throw new RpcException(
          AppError.from(ErrVariantDiscountNotFound, 404)
            .withLog('No active discount found for the given variant')
            .toJson(false),
        );
      }

      await this.phoneRepository.updateVariantDiscount(latestDiscount.id!, {
        endDate: new Date(),
        updatedAt: new Date(),
      });

      await this.phoneRepository.insertVariantDiscount({
        variantId: variant.id!,
        discountPercent: data.discount ?? 0,
        startDate: new Date(),
        endDate: null,
        isDeleted: false,
      });
    }

    if (data.images) {
      for (const imageDto of data.images) {
        const existingVariantImage = existingVariantImages.find(
          (img) => img.id === imageDto.id,
        );
        if (!existingVariantImage) {
          const newImage = await this.phoneRepository.insertImage({
            imageUrl: imageDto.imageUrl,
            isDeleted: false,
          });

          await this.phoneRepository.insertVariantImages([
            {
              variantId: variant.id!,
              imageId: newImage.id!,
              isDeleted: false,
            },
          ]);

          variantImageIds.add(newImage.id!);
        } else {
          if (imageDto.isDeleted === true) {
            const imageIdToDelete = existingVariantImage.imageId;

            const imageInVariantColor = existingVariantColors.find(
              (color) => color.imageId === imageIdToDelete,
            );

            if (imageInVariantColor) {
              throw new RpcException(
                AppError.from(
                  new Error(
                    'Cannot delete image that is in use by a color variant',
                  ),
                  400,
                )
                  .withLog(
                    `Image ${imageIdToDelete} is in use by color ${imageInVariantColor.colorId}`,
                  )
                  .toJson(false),
              );
            } else {
              await this.phoneRepository.deleteVariantImage(
                existingVariantImage.id!,
              );
              deletedImageIds.add(imageIdToDelete);
              variantImageIds.delete(imageIdToDelete);
            }
          } else if (imageDto.imageUrl) {
            const oldImageId = existingVariantImage.imageId;

            const imageInVariantColor = existingVariantColors.find(
              (color) => color.imageId === oldImageId,
            );

            if (imageInVariantColor) {
              const newImage = await this.phoneRepository.insertImage({
                imageUrl: imageDto.imageUrl,
                isDeleted: false,
              });

              await this.phoneRepository.updateVariantImage(
                existingVariantImage.id!,
                newImage.id!,
              );

              await this.phoneRepository.updateVariantColorByVariantIdAndColorId(
                variant.id!,
                imageInVariantColor.colorId,
                {
                  imageId: newImage.id!,
                  updatedAt: new Date(),
                  isDeleted: false,
                },
              );

              deletedImageIds.add(oldImageId);
              variantImageIds.delete(oldImageId);
              variantImageIds.add(newImage.id!);
              colorImageIds.delete(oldImageId);
              colorImageIds.add(newImage.id!);
            } else {
              const newImage = await this.phoneRepository.insertImage({
                imageUrl: imageDto.imageUrl,
                isDeleted: false,
              });

              await this.phoneRepository.updateVariantImage(
                existingVariantImage.id!,
                newImage.id!,
              );

              deletedImageIds.add(oldImageId);
              variantImageIds.delete(oldImageId);
              variantImageIds.add(newImage.id!);
            }
          }
        }
      }
    }

    if (data.specifications) {
      isOnlyUpdateImages = false;

      const existingVariantSpecs =
        await this.phoneRepository.findSpecificationsByVariantIds([
          variant.id!,
        ]);
      for (const specDto of data.specifications) {
        const existingVariantSpec = existingVariantSpecs.find(
          (spec) => spec.specId === specDto.specId,
        );

        if (!existingVariantSpec) {
          if (specDto.unit) {
            await this.phoneRepository.insertVariantSpecifications([
              {
                variantId: variant.id!,
                specId: specDto.specId,
                info: specDto.info + ' ' + specDto.unit,
                unit: specDto.unit,
                valueNumeric: parseFloat(specDto.info),
                isDeleted: false,
              },
            ]);
          } else {
            await this.phoneRepository.insertVariantSpecifications([
              {
                variantId: variant.id!,
                specId: specDto.specId,
                info: specDto.info,
                isDeleted: false,
              },
            ]);
          }
        } else {
          if (specDto.isDeleted === true) {
            await this.phoneRepository.deleteVariantSpecificationByVariantIdAndSpecId(
              variant.id!,
              specDto.specId,
            );
          } else {
            if (specDto.unit && parseFloatSafe(specDto.info) !== null) {
              await this.phoneRepository.updateVariantSpecificationByVariantIdAndSpecId(
                variant.id!,
                specDto.specId,
                {
                  specId: specDto.newSpecId,
                  info: specDto.info + ' ' + specDto.unit,
                  unit: specDto.unit,
                  valueNumeric: parseFloatSafe(specDto.info),
                  updatedAt: new Date(),
                  isDeleted: false,
                },
              );
            } else {
              await this.phoneRepository.updateVariantSpecificationByVariantIdAndSpecId(
                variant.id!,
                specDto.specId,
                {
                  specId: specDto.newSpecId,
                  info: specDto.info,
                  updatedAt: new Date(),
                  isDeleted: false,
                },
              );
            }
          }
        }
      }
    }

    if (deletedImageIds.size > 0) {
      const imagesToDelete = [...deletedImageIds].filter(
        (id) => !colorImageIds.has(id) && !variantImageIds.has(id),
      );

      if (imagesToDelete.length > 0) {
        await this.phoneRepository.deleteImagesByIds(imagesToDelete);
      }
    }

    if (!isOnlyUpdateImages) {
      const event = PhoneVariantUpdatedEvent.create(
        {
          id: variant.id!,
        },
        PHONE_SERVICE_NAME,
      );

      await this.eventPublisher.publish(event);
    }
  }

  async deletePhoneVariantsByIds(ids: number[]): Promise<void> {
    const variants = await this.phoneRepository.findVariantsByIds(ids);
    if (!variants || variants.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('Phone variants not found for the given IDs')
          .toJson(false),
      );
    }

    await this.deletePhoneVariants(ids);

    const event = PhoneVariantUpdatedEvent.create(
      {
        id: ids[0],
      },
      PHONE_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);
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
    const phones = await this.phoneRepository.findPhonesByIds(phoneIds);

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
          createdAt: phone.createdAt,
          updatedAt: phone.updatedAt,
          isDeleted: phone.isDeleted,
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
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        isDeleted: variant.isDeleted,
      } as PhoneVariantDto;
    });

    return variantDtos;
  }

  private async deletePhones(ids: number[]): Promise<void> {
    const variants = await this.phoneRepository.findVariantsByPhoneIds(ids);
    const variantIds = variants.map((v) => v.id!);
    if (variantIds.length > 0) {
      await this.deletePhoneVariants(variantIds);
    }

    await this.phoneRepository.softDeletePhonesByIds(ids);
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
      if (specDto.unit && parseFloatSafe(specDto.info) !== null) {
        variantSpecification.push({
          variantId: newVariant.id!,
          specId: specDto.specId,
          info: specDto.info + ' ' + specDto.unit,
          unit: specDto.unit,
          valueNumeric: parseFloatSafe(specDto.info),
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

  private async deletePhoneVariants(ids: number[]): Promise<void> {
    await this.phoneRepository.softDeleteVariantColorsByVariantIds(ids);
    await this.phoneRepository.softDeleteVariantPricesByVariantIds(ids);
    await this.phoneRepository.softDeleteVariantDiscountsByVariantIds(ids);

    const variantImages =
      await this.phoneRepository.findVariantImagesByVariantIds(ids);
    const imageIdsToDelete = variantImages.map((vi) => vi.imageId);

    await this.phoneRepository.softDeleteVariantImagesByVariantIds(ids);
    await this.phoneRepository.softDeleteImagesByIds(imageIdsToDelete);
    await this.phoneRepository.softDeleteVariantSpecificationsByVariantIds(ids);
    await this.phoneRepository.softDeleteReviewsByVariantIds(ids);

    await this.phoneRepository.softDeletePhoneVariantsByIds(ids);
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
