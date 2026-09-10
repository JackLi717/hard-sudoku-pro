package com.jackli717.sudoku

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class HintEnginePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      when (name) {
        HintEngineModule.NAME -> HintEngineModule(reactContext)
        ContentDatabaseModule.NAME -> ContentDatabaseModule(reactContext)
        ProductExperienceModule.NAME -> ProductExperienceModule(reactContext)
        AdMarketModule.NAME -> AdMarketModule(reactContext)
        PremiumPurchaseModule.NAME -> PremiumPurchaseModule(reactContext)
        else -> null
      }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        HintEngineModule.NAME to
            ReactModuleInfo(
                HintEngineModule.NAME,
                HintEngineModule.NAME,
                false,
                false,
                false,
                true,
            ),
        ContentDatabaseModule.NAME to
            ReactModuleInfo(
                ContentDatabaseModule.NAME,
                ContentDatabaseModule.NAME,
                false,
                false,
                false,
                true,
            ),
        ProductExperienceModule.NAME to
            ReactModuleInfo(
                ProductExperienceModule.NAME,
                ProductExperienceModule.NAME,
                false,
                false,
                false,
                true,
            ),
        AdMarketModule.NAME to
            ReactModuleInfo(
                AdMarketModule.NAME,
                AdMarketModule.NAME,
                false,
                false,
                false,
                true,
            ),
        PremiumPurchaseModule.NAME to
            ReactModuleInfo(
                PremiumPurchaseModule.NAME,
                PremiumPurchaseModule.NAME,
                false,
                false,
                false,
                true,
            ),
    )
  }
}
