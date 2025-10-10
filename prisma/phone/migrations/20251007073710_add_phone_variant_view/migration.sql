CREATE OR REPLACE VIEW phone_variant_view AS
SELECT
    pv.id AS variant_id,
    pv.phone_id,
    pv.variant_name,
    p.name AS phone_name,
    b.name AS brand_name,
    c.name AS category_name,

    vp.price,
    COALESCE(vd.discount_percent, 0) AS discount_percent,
    (vp.price * (1 - COALESCE(vd.discount_percent, 0) / 100.0)) AS final_price,

    MAX(
        CASE 
            WHEN LOWER(s.name) LIKE '%ram%' THEN 
                CASE 
                    WHEN LOWER(vs.unit) = 'tb' THEN vs.value_numeric * 1024 
                    ELSE vs.value_numeric
                END 
        END
    ) AS ram_gb,

    MAX(
        CASE 
            WHEN LOWER(s.name) LIKE '%bộ nhớ%' THEN 
                CASE 
                    WHEN LOWER(vs.unit) = 'tb' THEN vs.value_numeric * 1024 
                    ELSE vs.value_numeric
                END 
        END
    ) AS rom_gb,

    MAX(CASE WHEN LOWER(s.name) LIKE '%chipset%' THEN vs.info END) AS chipset,

    MAX(CASE WHEN LOWER(s.name) LIKE '%hệ điều hành%' THEN vs.info END) AS os,

    MAX(CASE WHEN LOWER(s.name) LIKE '%kích thước màn hình%' THEN vs.value_numeric END) AS screen_size,

    CASE WHEN SUM(CASE WHEN LOWER(s.name) LIKE '%nfc%' AND vs.info ILIKE '%có%' THEN 1 ELSE 0 END) > 0 THEN TRUE ELSE FALSE END AS nfc

FROM phone_variants pv
JOIN phones p ON p.id = pv.phone_id
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id

LEFT JOIN variant_prices vp 
    ON vp.variant_id = pv.id
    AND vp.start_date <= NOW()
    AND (vp.end_date IS NULL OR vp.end_date >= NOW())
    AND vp.is_deleted = FALSE

LEFT JOIN variant_discounts vd
    ON vd.variant_id = pv.id
    AND vd.start_date <= NOW()
    AND (vd.end_date IS NULL OR vd.end_date >= NOW())
    AND vd.is_deleted = FALSE

LEFT JOIN variant_specifications vs
    ON vs.variant_id = pv.id
    AND vs.is_deleted = FALSE

LEFT JOIN specifications s
    ON s.id = vs.spec_id
    AND s.is_deleted = FALSE

WHERE pv.is_deleted = FALSE
GROUP BY pv.id, pv.phone_id, pv.variant_name, p.name, b.name, c.name, vp.price, vd.discount_percent;
