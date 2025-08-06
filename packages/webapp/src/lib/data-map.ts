// packages/webapp/src/lib/data-map.ts

/**
 * Mapeia as "dataKeys" (usadas no frontend) para as "series_keys" (na base de dados).
 * Usado para gráficos que precisam de séries históricas completas.
 */
export const CHART_SERIES_MAP: Record<string, Record<string, string>> = {
  exchangeRatesChart: {
    usd: 'exchange_rate_eur_usd',
    gbp: 'exchange_rate_eur_gbp',
    chf: 'exchange_rate_eur_chf',
    cad: 'exchange_rate_eur_cad',
    aud: 'exchange_rate_eur_aud',
    cny: 'exchange_rate_eur_cny',
    brl: 'exchange_rate_eur_brl',
  },
  creditConditionsChart: {
    tan_variavel: 'credito_habitacao_bportugal_tan_variavel_monthly',
    tan_fixa: 'credito_habitacao_bportugal_tan_fixa_monthly',
    tan_mista: 'credito_habitacao_bportugal_tan_mista_monthly',
    prestacao_mediana: 'credito_habitacao_bportugal_prestacao_mediana_monthly'
  },
  euriborQuotasChart: {
    '3m': 'euribor_quota_bportugal_3m_monthly',
    '6m': 'euribor_quota_bportugal_6m_monthly',
    '12m': 'euribor_quota_bportugal_12m_monthly',
  },
  euriborRatesChart: {
    '3_meses': 'euribor_rate_bportugal_3_meses_monthly',
    '6_meses': 'euribor_rate_bportugal_6_meses_monthly',
    '12_meses': 'euribor_rate_bportugal_12_meses_monthly',
  },
  inflationHistoricalChart: {
    yoy: 'inflation_bportugal_headline_yoy_monthly',
    core_yoy: 'inflation_bportugal_core_yoy_monthly',
  },

  // Adicionar ao objeto CHART_SERIES_MAP em src/lib/data-map.ts
  housingPriceIndexChart: {
    total: 'house_price_index_bportugal_total_quarterly',
    new: 'house_price_index_bportugal_new_quarterly',
    existing: 'house_price_index_bportugal_existing_quarterly',
  },

  // Adicionar ao objeto CHART_SERIES_MAP em src/lib/data-map.ts
  ratesCompareChart: {
    taeg: 'interest_rate_bportugal_taeg_monthly',
    tan_variavel: 'credito_habitacao_bportugal_tan_variavel_monthly',
  },
};

/**
 * NOVO: Mapeia dataKeys para GRUPOS de indicadores.
 * Usado para componentes que precisam dos valores mais recentes de várias séries.
 */
export const INDICATOR_GROUP_MAP: Record<string, Record<string, string>> = {
    inflationBreakdownIndicators: {
        food_drinks: 'latest_inflation_bportugal_category_yoy_food_drinks_monthly',
        alcoholic_tobacco: 'latest_inflation_bportugal_category_yoy_alcoholic_tobacco_monthly',
        clothing_footwear: 'latest_inflation_bportugal_category_yoy_clothing_footwear_monthly',
        housing_utilities: 'latest_inflation_bportugal_category_yoy_housing_utilities_monthly',
        furnishings: 'latest_inflation_bportugal_category_yoy_furnishings_monthly',
        health: 'latest_inflation_bportugal_category_yoy_health_monthly',
        transport: 'latest_inflation_bportugal_category_yoy_transport_monthly',
        communications: 'latest_inflation_bportugal_category_yoy_communications_monthly',
        recreation_culture: 'latest_inflation_bportugal_category_yoy_recreation_culture_monthly',
        education: 'latest_inflation_bportugal_category_yoy_education_monthly',
        restaurants_hotels: 'latest_inflation_bportugal_category_yoy_restaurants_hotels_monthly',
        misc_goods_services: 'latest_inflation_bportugal_category_yoy_misc_goods_services_monthly',
    },

    // Adicionar ao objeto INDICATOR_GROUP_MAP em src/lib/data-map.ts
  defaultRiskMapData: {
      "Norte (NUTS II)": "risk_incumprimento_bportugal_norte_nuts_ii",
      "Douro (NUTS III)": "risk_incumprimento_bportugal_douro_nuts_iii",
      "Tâmega e Sousa (NUTS III)": "risk_incumprimento_bportugal_tâmega_e_sousa_nuts_iii",
      "Terras de Trás-os-Montes (NUTS III)": "risk_incumprimento_bportugal_terras_de_trás-os-montes_nuts_iii",
      "Centro (NUTS II)": "risk_incumprimento_bportugal_centro_nuts_ii",
      "Área Metropolitana de Lisboa (NUTS II)": "risk_incumprimento_bportugal_área_metropolitana_de_lisboa_nuts_ii",
      "Grande Lisboa (NUTS II)": "risk_incumprimento_bportugal_grande_lisboa_nuts_ii",
      "Grande Lisboa (NUTS III)": "risk_incumprimento_bportugal_grande_lisboa_nuts_iii",
      "Península de Setúbal (NUTS II)": "risk_incumprimento_bportugal_península_de_setúbal_nuts_ii",
      "Alentejo (NUTS II)": "risk_incumprimento_bportugal_alentejo_nuts_ii",
      "Lezíria do Tejo (NUTS III)": "risk_incumprimento_bportugal_lezíria_do_tejo_nuts_iii",
      "Algarve (NUTS II)": "risk_incumprimento_bportugal_algarve_nuts_ii",
  },
};

/**
 * Mapeia dataKeys para indicadores únicos.
 */
export const KPI_MAP: Record<string, string> = {
  // Exemplo:
  // latestInflation: 'latest_inflation_bportugal_headline_yoy_monthly',
};