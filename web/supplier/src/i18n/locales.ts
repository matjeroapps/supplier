export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const messages: Record<Locale, {
  appName: string;
  nav: {
    dashboard: string;
    products: string;
    offers: string;
    inventory: string;
    locations: string;
    integrations: string;
    retail: string;
    settings: string;
  };
  kpi: {
    totalProducts: string;
    activeOffers: string;
    pendingSync: string;
    totalLocations: string;
  };
  products: {
    title: string;
    addProduct: string;
    slug: string;
    supplierCode: string;
    status: string;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    categories: string;
    skuCodeLabel: string;
    barcodeLabel: string;
    variantsSection: string;
    mediaSection: string;
    addMedia: string;
    primaryImage: string;
    deleteMedia: string;
    setPrimary: string;
    save: string;
    cancel: string;
  };
  offers: {
    title: string;
    addOffer: string;
    productId: string;
    marketId: string;
    marketCode: string;
    wholesalePrice: string;
    currency: string;
    moq: string;
    status: string;
    save: string;
    cancel: string;
    minOrderQty: string;
  };
  inventory: {
    title: string;
    snapshotsTab: string;
    movementsTab: string;
    locationsTab: string;
    locationId: string;
    skuId: string;
    onHand: string;
    reserved: string;
    adjustStock: string;
    deltaQty: string;
    reason: string;
    movementType: string;
    confirmAdjustment: string;
    cancel: string;
    movementTypes: {
      adjustment: string;
      receipt: string;
      shipment: string;
      return: string;
    };
  };
  locations: {
    title: string;
    addLocation: string;
    marketId: string;
    marketCode: string;
    code: string;
    name: string;
    locationType: string;
    status: string;
    save: string;
    cancel: string;
  };
  integrations: {
    title: string;
    triggerSync: string;
    jobId: string;
    connectionId: string;
    status: string;
    processedItems: string;
    failedItems: string;
    totalItems: string;
    retryJob: string;
    errorSummary: string;
    noJobs: string;
  };
  retail: {
    title: string;
    statusProvisioned: string;
    notProvisioned: string;
    provisionBtn: string;
    createStoreBtn: string;
    storeCode: string;
    storeName: string;
    marketCode: string;
    save: string;
    cancel: string;
    storesList: string;
  };
  settings: {
    title: string;
    supplierName: string;
    status: string;
    advancedSettings: string;
    save: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    active: string;
    inactive: string;
    noData: string;
    success: string;
  };
}> = {
  ar: {
    appName: 'بوابة المورد | ماتجر',
    nav: {
      dashboard: 'لوحة التحكم',
      products: 'المنتجات',
      offers: 'العروض',
      inventory: 'المخزون',
      locations: 'المواقع',
      integrations: 'التكاملات',
      retail: 'قناة البيع المباشر',
      settings: 'الإعدادات',
    },
    kpi: {
      totalProducts: 'إجمالي المنتجات',
      activeOffers: 'العروض النشطة',
      pendingSync: 'مزامنة معلقة',
      totalLocations: 'إجمالي المواقع',
    },
    products: {
      title: 'المنتجات',
      addProduct: 'إضافة منتج',
      slug: 'المعرف الفريد',
      supplierCode: 'كود المورد',
      status: 'الحالة',
      nameEn: 'الاسم (إنجليزي)',
      nameAr: 'الاسم (عربي)',
      descriptionEn: 'الوصف (إنجليزي)',
      descriptionAr: 'الوصف (عربي)',
      categories: 'الفئات',
      skuCodeLabel: 'كود SKU',
      barcodeLabel: 'الباركود',
      variantsSection: 'المتغيرات / SKU',
      mediaSection: 'معرض الصور',
      addMedia: 'رفع صورة',
      primaryImage: 'الصورة الرئيسية',
      deleteMedia: 'حذف الصورة',
      setPrimary: 'تعيين كرئيسية',
      save: 'حفظ',
      cancel: 'إلغاء',
    },
    offers: {
      title: 'العروض',
      addOffer: 'إضافة عرض',
      productId: 'معرف المنتج',
      marketId: 'معرف السوق',
      marketCode: 'كود السوق',
      wholesalePrice: 'السعر بالجملة',
      currency: 'العملة',
      moq: 'الحد الأدنى للطلب',
      status: 'الحالة',
      save: 'حفظ',
      cancel: 'إلغاء',
      minOrderQty: 'الحد الأدنى للكمية',
    },
    inventory: {
      title: 'المخزون',
      snapshotsTab: 'لقطات المخزون',
      movementsTab: 'حركات المخزون',
      locationsTab: 'المواقع',
      locationId: 'معرف الموقع',
      skuId: 'معرف SKU',
      onHand: 'الكمية المتاحة',
      reserved: 'الكمية المحجوزة',
      adjustStock: 'تعديل المخزون',
      deltaQty: 'كمية التعديل',
      reason: 'السبب',
      movementType: 'نوع الحركة',
      confirmAdjustment: 'تأكيد التعديل',
      cancel: 'إلغاء',
      movementTypes: {
        adjustment: 'تعديل',
        receipt: 'استلام',
        shipment: 'شحن',
        return: 'إرجاع',
      },
    },
    locations: {
      title: 'مواقع التخزين',
      addLocation: 'إضافة موقع',
      marketId: 'معرف السوق',
      marketCode: 'كود السوق',
      code: 'الكود',
      name: 'الاسم',
      locationType: 'نوع الموقع',
      status: 'الحالة',
      save: 'حفظ',
      cancel: 'إلغاء',
    },
    integrations: {
      title: 'التكاملات ومزامنة الكتالوج',
      triggerSync: 'تشغيل مزامنة الكتالوج',
      jobId: 'معرف المهمة',
      connectionId: 'معرف الاتصال',
      status: 'الحالة',
      processedItems: 'البنود المعالجة',
      failedItems: 'البنود الفاشلة',
      totalItems: 'إجمالي البنود',
      retryJob: 'إعادة المحاولة',
      errorSummary: 'ملخص الأخطاء',
      noJobs: 'لا توجد مهام مزامنة بعد',
    },
    retail: {
      title: 'قناة البيع المباشر',
      statusProvisioned: 'تم التفعيل',
      notProvisioned: 'غير مفعل',
      provisionBtn: 'تفعيل قناة البيع المباشر',
      createStoreBtn: 'إنشاء متجر',
      storeCode: 'كود المتجر',
      storeName: 'اسم المتجر',
      marketCode: 'كود السوق',
      save: 'حفظ',
      cancel: 'إلغاء',
      storesList: 'المتاجر المرتبطة',
    },
    settings: {
      title: 'إعدادات المورد',
      supplierName: 'اسم المورد',
      status: 'الحالة',
      advancedSettings: 'إعدادات متقدمة (JSON)',
      save: 'حفظ الإعدادات',
    },
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      retry: 'إعادة المحاولة',
      save: 'حفظ',
      cancel: 'إلغاء',
      active: 'نشط',
      inactive: 'غير نشط',
      noData: 'لا توجد بيانات',
      success: 'تمت العملية بنجاح',
    },
  },
  en: {
    appName: 'Supplier Portal | MatjerHub',
    nav: {
      dashboard: 'Dashboard',
      products: 'Products',
      offers: 'Market Offers',
      inventory: 'Inventory',
      locations: 'Locations',
      integrations: 'Integrations',
      retail: 'Direct Retail',
      settings: 'Settings',
    },
    kpi: {
      totalProducts: 'Total Products',
      activeOffers: 'Active Offers',
      pendingSync: 'Pending Sync',
      totalLocations: 'Total Locations',
    },
    products: {
      title: 'Products',
      addProduct: 'Add Product',
      slug: 'Slug',
      supplierCode: 'Supplier Code',
      status: 'Status',
      nameEn: 'Name (English)',
      nameAr: 'Name (Arabic)',
      descriptionEn: 'Description (English)',
      descriptionAr: 'Description (Arabic)',
      categories: 'Categories',
      skuCodeLabel: 'SKU Code',
      barcodeLabel: 'Barcode',
      variantsSection: 'Variants / SKU',
      mediaSection: 'Media Gallery',
      addMedia: 'Upload Image',
      primaryImage: 'Primary Image',
      deleteMedia: 'Delete Image',
      setPrimary: 'Set as Primary',
      save: 'Save',
      cancel: 'Cancel',
    },
    offers: {
      title: 'Market Offers',
      addOffer: 'Add Offer',
      productId: 'Product ID',
      marketId: 'Market ID',
      marketCode: 'Market Code',
      wholesalePrice: 'Wholesale Price',
      currency: 'Currency',
      moq: 'Minimum Order Quantity',
      status: 'Status',
      save: 'Save',
      cancel: 'Cancel',
      minOrderQty: 'Min Order Qty',
    },
    inventory: {
      title: 'Inventory',
      snapshotsTab: 'Snapshots',
      movementsTab: 'Movement History',
      locationsTab: 'Locations',
      locationId: 'Location ID',
      skuId: 'SKU ID',
      onHand: 'On Hand',
      reserved: 'Reserved',
      adjustStock: 'Adjust Stock',
      deltaQty: 'Quantity Delta',
      reason: 'Reason',
      movementType: 'Movement Type',
      confirmAdjustment: 'Confirm Adjustment',
      cancel: 'Cancel',
      movementTypes: {
        adjustment: 'Adjustment',
        receipt: 'Receipt',
        shipment: 'Shipment',
        return: 'Return',
      },
    },
    locations: {
      title: 'Fulfillment Locations',
      addLocation: 'Add Location',
      marketId: 'Market ID',
      marketCode: 'Market Code',
      code: 'Code',
      name: 'Name',
      locationType: 'Location Type',
      status: 'Status',
      save: 'Save',
      cancel: 'Cancel',
    },
    integrations: {
      title: 'Integrations & Catalog Sync',
      triggerSync: 'Trigger Catalog Import Sync',
      jobId: 'Job ID',
      connectionId: 'Connection ID',
      status: 'Status',
      processedItems: 'Processed',
      failedItems: 'Failed',
      totalItems: 'Total',
      retryJob: 'Retry',
      errorSummary: 'Error Summary',
      noJobs: 'No sync jobs yet',
    },
    retail: {
      title: 'Direct Retail Channel',
      statusProvisioned: 'Provisioned',
      notProvisioned: 'Not Provisioned',
      provisionBtn: 'Provision Retail Channel',
      createStoreBtn: 'Create Store',
      storeCode: 'Store Code',
      storeName: 'Store Name',
      marketCode: 'Market Code',
      save: 'Save',
      cancel: 'Cancel',
      storesList: 'Affiliated Stores',
    },
    settings: {
      title: 'Supplier Settings',
      supplierName: 'Supplier Name',
      status: 'Status',
      advancedSettings: 'Advanced Settings (JSON)',
      save: 'Save Settings',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      save: 'Save',
      cancel: 'Cancel',
      active: 'Active',
      inactive: 'Inactive',
      noData: 'No data available',
      success: 'Operation completed successfully',
    },
  },
};

export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
