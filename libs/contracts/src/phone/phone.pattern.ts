export const PHONE_PATTERN = {
  LIST_PHONES: 'phone.listPhones',
  GET_PHONES_BY_IDS: 'phone.getPhonesByIds',
  GET_PHONE_BY_ID: 'phone.getPhoneById',
  CREATE_PHONE: 'phone.createPhone',
  UPDATE_PHONE: 'phone.updatePhone',
  DELETE_PHONE: 'phone.deletePhone',

  GET_ALL_BRANDS: 'phone.getAllBrands',
  CREATE_BRAND: 'phone.createBrand',
  UPDATE_BRAND: 'phone.updateBrand',
  DELETE_BRAND: 'phone.deleteBrand',

  GET_ALL_CATEGORIES: 'phone.getAllCategories',
  GET_CATEGORIES_BY_IDS: 'phone.getCategoriesByIds',
  GET_PARENT_CATEGORY_IDS_BY_VARIANT_IDS:
    'phone.getParentCategoryIdsByVariantIds',
  CREATE_CATEGORY: 'phone.createCategory',
  UPDATE_CATEGORY: 'phone.updateCategory',
  DELETE_CATEGORY: 'phone.deleteCategory',

  GET_ALL_COLORS: 'phone.getAllColors',
  CREATE_COLOR: 'phone.createColor',

  GET_ALL_VARIANTS: 'phone.getAllVariants',
  GET_PHONE_VARIANT_IDS: 'phone.getPhoneVariantIds',
  GET_VARIANTS_BY_IDS: 'phone.getVariantsByIds',
  GET_VARIANT_BY_ID: 'phone.getVariantById',
  LIST_PHONE_VARIANTS: 'phone.listPhoneVariants',
  GET_RELATED_VARIANTS: 'phone.getRelatedVariants',
  CREATE_PHONE_VARIANT: 'phone.createPhoneVariant',
  UPDATE_PHONE_VARIANT: 'phone.updatePhoneVariant',
  DELETE_PHONE_VARIANT: 'phone.deletePhoneVariant',

  GET_IMAGES_BY_IDS: 'phone.getImagesByIds',

  GET_ALL_SPECIFICATIONS: 'phone.getAllSpecifications',
  CREATE_SPECIFICATION: 'phone.createSpecification',

  GET_INVENTORY_BY_SKU: 'phone.getInventoryBySku',
  GET_INVENTORIES_BY_NAME: 'phone.getInventoriesByName',
  CHECK_INVENTORY_AVAILABILITY: 'phone.checkInventoryAvailability',
  ADD_INVENTORY: 'phone.addInventory',

  CREATE_REVIEW: 'phone.createReview',

  SEARCH_PHONES: 'phone.searchPhones',
  SYNC_PHONES_TO_SEARCH: 'phone.syncPhonesToSearch',
};

export const PHONE_SERVICE_NAME = 'phone-service';
export const ES_SEARCH_INDEX = 'phones';
