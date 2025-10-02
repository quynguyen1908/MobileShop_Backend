import { Inject, Injectable } from '@nestjs/common';
import type { IPhoneQueryRepository, IPhoneService } from './phone.port';
import { AppError, PHONE_REPOSITORY } from '@app/contracts';
import {
  ErrBrandNotFound,
  ErrCategoryNotFound,
  ErrPhoneNotFound,
  ErrPhoneVariantNotFound,
  ErrSpecificationNotFound,
  ErrVariantColorNotFound,
  ErrVariantImagesNotFound,
  ErrVariantPriceNotFound,
  ErrVariantSpecificationsNotFound,
  PhoneDto,
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

    const variantDtos = await Promise.all(
      variants.map(async (variant) => {
        if (typeof variant.id !== 'number') {
          throw new RpcException(
            AppError.from(ErrPhoneVariantNotFound, 404)
              .withLog('Variant ID is invalid')
              .toJson(false),
          );
        }
        const color = await this.phoneRepository.findColorByVariantId(
          variant.id,
        );
        if (!color) {
          throw new RpcException(
            AppError.from(ErrVariantColorNotFound, 404)
              .withLog('Variant color not found')
              .toJson(false),
          );
        }

        const price = await this.phoneRepository.findPriceByVariantId(
          variant.id,
        );
        if (!price) {
          throw new RpcException(
            AppError.from(ErrVariantPriceNotFound, 404)
              .withLog('Variant price not found')
              .toJson(false),
          );
        }

        const discount = await this.phoneRepository.findDiscountByVariantId(
          variant.id,
        );

        const images = await this.phoneRepository.findImagesByVariantId(
          variant.id,
        );
        if (!images || images.length === 0) {
          throw new RpcException(
            AppError.from(ErrVariantImagesNotFound, 404)
              .withLog('Variant images not found')
              .toJson(false),
          );
        }

        const variantSpecifications =
          await this.phoneRepository.findSpecificationsByVariantId(variant.id);
        if (!variantSpecifications || variantSpecifications.length === 0) {
          throw new RpcException(
            AppError.from(ErrVariantSpecificationsNotFound, 404)
              .withLog('Variant specifications not found')
              .toJson(false),
          );
        }

        const specificationIds = variantSpecifications.map((vs) => vs.specId);
        const specifications =
          await this.phoneRepository.findSpecificationByIds(specificationIds);
        if (!specifications || specifications.length === 0) {
          throw new RpcException(
            AppError.from(ErrSpecificationNotFound, 404)
              .withLog('Specifications not found')
              .toJson(false),
          );
        }

        const variantSpecificationDtos: VariantSpecificationDto[] =
          variantSpecifications.map((vs) => {
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
          color: { name: color.name, id: color.id },
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
          images: images.map((img) => ({
            id: img.id,
            variantId: img.variantId,
            imageUrl: img.imageUrl,
          })),
          specifications: variantSpecificationDtos,
        } as VariantDto;
      }),
    );

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
}
