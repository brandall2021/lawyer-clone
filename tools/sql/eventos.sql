SELECT
  HGCodOri, HGCodigo, HGCodOriGes, HGCodGes,
  HGFecha, HGHora, HGFecEje, HGFecCar, HGFecAlta,
  HGCodTipEve, HGCodResult, HGCodConc, HGCodResp, HGCodUsu, HGTipoCont, HGCodEstado, HGMoneda, HGCaja,
  HGImporte, HGCapital, HGInteres, HGIVA, HGGastos, HGHonorarios, HGCosto,
  HGAjuste, HGSigno,
  HGPendiente, HGPositivo, HGEfectivo,
  RTRIM(HGSentido) AS HGSentido,
  RTRIM(HGTexto)   AS HGTexto,
  CAST(HGObsText AS varchar(2000)) AS HGObsText
FROM HistGest WITH (NOLOCK)
