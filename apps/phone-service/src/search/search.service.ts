import {
  ES_SEARCH_INDEX,
  PhoneVariantDto,
  SearchPhoneDto,
  SearchPhoneResult,
} from '@app/contracts/phone';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly esService: ElasticsearchService) {}

  async onModuleInit() {
    await this.createIndexIfNotExists();
  }

  async createIndexIfNotExists() {
    const indexExists = await this.esService.indices.exists({
      index: ES_SEARCH_INDEX,
    });
    if (!indexExists) {
      this.logger.log(`Creating Elasticsearch index: ${ES_SEARCH_INDEX}`);
      await this.esService.indices.create({
        index: ES_SEARCH_INDEX,
        settings: {
          analysis: {
            analyzer: {
              vi_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding'],
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            phoneId: { type: 'keyword' },
            name: { type: 'text', analyzer: 'vi_analyzer' },
            category: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } },
            },
            originalPrice: { type: 'double' },
            discountPercent: { type: 'integer' },
            imageUrl: { type: 'keyword' },
          },
        },
      });
    }
  }

  // Insert or update

  async bulkIndex(variants: PhoneVariantDto[]) {
    const operations = variants.flatMap((document) => [
      { index: { _index: ES_SEARCH_INDEX, _id: document.id!.toString() } },
      this.transformVariantToDocument(document),
    ]);

    if (operations.length > 0) {
      await this.esService.bulk({ refresh: true, operations });
    }
  }

  // Delete

  async bulkDelete(ids: string[]) {
    if (ids.length === 0) return;

    const operations = ids.map((id) => ({
      delete: { _index: ES_SEARCH_INDEX, _id: id },
    }));

    return this.esService.bulk({ refresh: true, operations });
  }

  // Search

  async searchInstant(keyword: string): Promise<SearchPhoneResult> {
    const result = await this.esService.search({
      index: ES_SEARCH_INDEX,
      size: 5,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: keyword,
                fields: ['name^3', 'category', 'brand'],
                fuzziness: 'AUTO',
                // operator: 'and',
              },
            },
          ],
        },
      },
      aggs: {
        related_categories: {
          terms: {
            field: 'category.keyword',
            size: 5,
          },
        },
      },
    });

    const hits: SearchPhoneDto[] = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is SearchPhoneDto => !!doc);

    type RelatedCategoriesAgg = { buckets: { key: string }[] };
    const aggs = result.aggregations as
      | { related_categories?: RelatedCategoriesAgg }
      | undefined;

    return {
      phones: hits.map((hit) => ({
        id: hit.id,
        name: hit.name,
        imageUrl: hit.imageUrl,
        originalPrice: hit.originalPrice,
        discountPercent: hit.discountPercent,
      })),
      categories:
        aggs?.related_categories?.buckets?.map((bucket) => bucket.key) ?? [],
    };
  }

  private transformVariantToDocument(variant: PhoneVariantDto): SearchPhoneDto {
    const phone = variant.phone;

    const price = variant.price.price;
    const discountPercent = variant.discount?.discountPercent || 0;

    const thumbnailImageId = variant.colors?.[0]?.imageId;
    const thumbnailImage =
      variant.images?.find((img) => img.image.id === thumbnailImageId)?.image
        .imageUrl ||
      variant.images?.[0]?.image.imageUrl ||
      '';
    const fullName = `${phone.name} ${variant.variantName}`;

    return {
      id: variant.id!.toString(),
      phoneId: variant.phone.id!.toString(),
      name: fullName,
      category: phone.category.name,
      originalPrice: price,
      discountPercent,
      imageUrl: thumbnailImage,
    };
  }
}
