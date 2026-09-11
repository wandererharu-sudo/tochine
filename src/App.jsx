import { useEffect, useMemo, useRef, useState } from 'react'
import AddressSearch from './components/AddressSearch'
import PointList from './components/PointList'
import MapPanel from './components/MapPanel'
import ValuationCard from './components/ValuationCard'
import PriceCompareCard from './components/PriceCompareCard'
import TaxCard from './components/TaxCard'
import SashineCard from './components/SashineCard'
import ChintaiCard from './components/ChintaiCard'
import ZoningCard from './components/ZoningCard'
import RosenkaCard from './components/RosenkaCard'
import SavedList from './components/SavedList'
import ExternalLinks from './components/ExternalLinks'
import Disclaimer from './components/Disclaimer'
import QuickSummary from './components/QuickSummary'
import DetailSection from './components/DetailSection'
import { syncInitialCosts, restoreInitialCosts, effectiveRental } from './lib/costs'
import { geocode } from './lib/geocode'
import { nearestPoints } from './lib/geo'
import { ROSENKA_RATIO, CHOUSEI_DEFAULT, evaluate, taxEstimate, tsuboToM2 } from './lib/tax'
import { PREFS, prefCodeFromAddress } from './lib/prefecture'
import { lookupZoning } from './lib/youto'
import { regionalAdjustment } from './lib/adjustment'
import { readImportParams, importedRental } from './lib/importParams'
import './App.css'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`
// URLパラメータからの自動入力（ブックマークレット／みこ経由の取り込み用）
// 例: ?addr=愛知県常滑市新開町1-2&price=1980&area=165.3&unit=m2&src=https://suumo.jp/...
const EMPTY_COSTS = { kaitai: '', zanchi: '', reform: '', safety: '10' } // 指値逆算の初期値（万円・%）
const EMPTY_CHINTAI = {
  kakaku: '', yachin: '', shoki: '', keihi: '15', // 万円・%
  shokiMode: 'linked', shohiyo: '', manualShoki: '',
  brokerage: 'estimate', shohiyoSource: 'manual',
  kariire: '', kinri: '2.0', kikan: '15', // 借入（任意）
}

export default function App() {
  const [meta, setMeta] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null) // {title, lat, lon}
  const [prefCode, setPrefCode] = useState(null)
  const [needPrefSelect, setNeedPrefSelect] = useState(false)
  const [points, setPoints] = useState(null) // 選択県の全地点
  const [residentialOnly, setResidentialOnly] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState('m2')
  const [price, setPrice] = useState('')
  const [rosenkaInput, setRosenkaInput] = useState('') // 路線価図で読んだ実数値（千円/㎡）
  const [kuiki, setKuiki] = useState('') // 区域区分（手入力・市街化調整区域の警戒用）
  const [youto, setYouto] = useState('') // 用途地域（手入力）
  const [zoningAuto, setZoningAuto] = useState(null) // 用途地域の自動判定結果（lib/youto.js）
  const zoningReq = useRef(0) // 連続検索時に古い判定結果で上書きしないための通し番号
  const [pointZoning, setPointZoning] = useState({}) // 最寄り地点ごとの区域区分・用途地域 {n+s: 判定結果}
  const [chousei, setChousei] = useState(CHOUSEI_DEFAULT) // 調整区域の減価補正率
  const [costs, setCosts] = useState(EMPTY_COSTS) // 指値逆算の費用入力
  const [chintai, setChintai] = useState(EMPTY_CHINTAI) // 賃貸収支の入力
  const [gpsLoading, setGpsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)
  const [imported] = useState(() => readImportParams(window.location.search)) // URL取り込み元（物件ページ）
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tochine_saved')) ?? []
    } catch {
      return []
    }
  })
  const prefCache = useRef({}) // {code: points[]}
  const pendingImport = useRef(null)
  const requestId = useRef(0)
  const searchId = useRef(0)

  const changeCosts = (next) => {
    setCosts(next)
    setChintai((previous) => syncInitialCosts(previous, next))
  }
  const changeChintai = (next) => setChintai(syncInitialCosts(next, costs))
  const openBuying = () => {
    const section = document.getElementById('buying-details')
    if (!section) return
    section.open = true
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    section.querySelector('summary')?.focus({ preventScroll: true })
  }

  const persistSaved = (list) => {
    setSaved(list)
    localStorage.setItem('tochine_saved', JSON.stringify(list))
  }

  useEffect(() => {
    fetch(`${DATA_BASE}index.json`)
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {})
  }, [])

  // URLパラメータで住所が渡されたら起動時に自動検索（価格・面積もプリセット）
  useEffect(() => {
    if (!imported) return
    if (imported.price) setPrice(imported.price)
    if (imported.area) setArea(imported.area)
    setUnit(imported.unit)
    handleSearch(imported.addr, imported)
    // 再読み込みで二重取り込みにならないようパラメータはURLから消す（表示用stateは保持）
    window.history.replaceState(null, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (query, importData = null) => {
    const request = ++searchId.current
    pendingImport.current = importData
    setLoading(true)
    setError('')
    setCandidates([])
    try {
      const results = await geocode(query)
      if (request !== searchId.current) return
      if (results.length === 0) {
        setError('住所が見つかりませんでした。表記を変えて試すか、')
      } else if (results.length === 1) {
        await handleSelect(results[0])
      } else {
        setCandidates(results)
      }
    } catch {
      if (request !== searchId.current) return
      setError('住所検索に失敗しました。時間をおいて再試行するか、')
    } finally {
      if (request === searchId.current) setLoading(false)
    }
  }

  const loadPref = async (code) => {
    if (prefCache.current[code]) return prefCache.current[code]
    const res = await fetch(`${DATA_BASE}${code}.json`)
    if (!res.ok) throw new Error(`data ${code}: HTTP ${res.status}`)
    const json = await res.json()
    prefCache.current[code] = json.points
    return json.points
  }

  const handleSelect = async (cand, forcedCode = null) => {
    setCandidates([])
    setLocation(cand)
    setPoints(null)
    setSelectedPoint(null)
    setRosenkaInput('') // 場所が変われば前面道路も変わるのでリセット
    setKuiki('')
    setYouto('')
    setChousei(CHOUSEI_DEFAULT)
    setCosts(EMPTY_COSTS)
    setChintai(importedRental(EMPTY_CHINTAI, pendingImport.current))
    pendingImport.current = null
    setError('')
    const code = forcedCode ?? prefCodeFromAddress(cand.title)
    setPrefCode(code)
    setNeedPrefSelect(!code)
    runZoningLookup(cand.lat, cand.lon, code)
    if (!code) {
      requestId.current += 1
      setPoints(null)
      return
    }
    await selectPref(code)
  }

  // 用途地域・区域区分の自動判定（対応県のみ）。手入力が空のときだけセレクトに反映する
  const runZoningLookup = (lat, lon, code) => {
    const id = ++zoningReq.current
    setZoningAuto({ status: 'loading' })
    lookupZoning(lat, lon, code).then((res) => {
      if (id !== zoningReq.current) return
      setZoningAuto(res)
      if (res.status === 'ok') {
        if (res.kuiki) setKuiki((prev) => prev || res.kuiki)
        if (res.youto) setYouto((prev) => prev || res.youto)
      }
    })
  }

  // ⑤現在地から検索: geolocation → GSI逆ジオコーダで市区町村コード → 県判定
  const handleGps = () => {
    if (!navigator.geolocation) {
      setError('この端末では現在地を取得できません。')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        let title = '現在地'
        let code = null
        try {
          const res = await fetch(
            `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`)
          const j = await res.json()
          const muni = j?.results?.muniCd
          if (muni) code = String(muni).padStart(5, '0').slice(0, 2)
          if (j?.results?.lv01Nm) title = `現在地（${j.results.lv01Nm}付近）`
        } catch { /* 県判定できなければ手動セレクタにフォールバック */ }
        await handleSelect({ title, lat, lon }, code)
        setGpsLoading(false)
      },
      () => {
        setError('現在地を取得できませんでした。位置情報の許可をご確認いただくか、')
        setGpsLoading(false)
      },
      { timeout: 10000 },
    )
  }

  const selectPref = async (code) => {
    const request = ++requestId.current
    setPoints(null)
    setSelectedPoint(null)
    setPrefCode(code)
    setNeedPrefSelect(false)
    try {
      const next = await loadPref(code)
      if (request === requestId.current) setPoints(next)
    } catch {
      if (request !== requestId.current) return
      setError('地価データの読み込みに失敗しました。通信環境をご確認ください。')
      setPoints(null)
    }
  }

  const nearest = useMemo(() => {
    if (!points || !location) return null
    const pool = residentialOnly ? points.filter((p) => p.u === '住宅地') : points
    return nearestPoints(pool, location.lat, location.lon, 5)
  }, [points, location, residentialOnly])

  // 最寄り地点それぞれの区域区分・用途地域（対応県のみ）。ファイルは lib/youto.js 側でキャッシュされるので地点数分でも軽い
  useEffect(() => {
    if (!nearest || !prefCode) { setPointZoning({}); return }
    let alive = true
    setPointZoning({})
    Promise.all(
      [...nearest, ...(selectedPoint && Number.isFinite(selectedPoint.lat) ? [selectedPoint] : [])]
        .map((p) => lookupZoning(p.lat, p.lon, prefCode).then((res) => [p.n + p.s, res]))
    ).then((entries) => {
      if (alive) setPointZoning(Object.fromEntries(entries))
    })
    return () => { alive = false }
  }, [nearest, prefCode, selectedPoint])

  const current = selectedPoint ?? (nearest && nearest[0]) ?? null

  // 市街化調整区域なら周辺公示の単価に減価補正を掛けた概算で全カードを計算する
  // （路線価図の実数値を入力した場合はそちらが正なので補正は掛からない）
  const referenceZoning = current ? pointZoning[current.n + current.s] : null
  const correction = regionalAdjustment(kuiki, referenceZoning, chousei)
  const chouseiRatio = correction.ratio
  const adjusted =
    current && chouseiRatio !== 1
      ? { ...current, p: current.p * chouseiRatio, chousei: String(chouseiRatio) }
      : current

  const actualRosenka = rosenkaInput !== '' ? (Number(rosenkaInput) || 0) * 1000 || null : null
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const rental = effectiveRental(chintai, costs,
    (Number(chintai.kakaku) || Number(price) || 0) * 10000,
    adjusted ? evaluate(adjusted.p, areaM2, actualRosenka).kotei : 0)

  // 緯度経度をコピー（Googleマップ等にそのまま貼れる形式）
  const copyLatLon = async () => {
    try {
      await navigator.clipboard.writeText(`${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* クリップボード不可の環境では表示のみ */ }
  }

  // ④検討物件の保存（同じ住所は上書き）
  const saveCurrent = () => {
    if (!location) return
    // 年間固都税の概算も保存しておく（賃貸収支シミュレーターへの引き継ぎ用）
    const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
    let taxYear = null
    if (adjusted && areaM2 > 0) {
      const tx = taxEstimate(evaluate(adjusted.p, areaM2, actualRosenka).kotei, areaM2)
      if (tx) {
        const noToshikei = kuiki !== '' && kuiki !== '市街化区域'
        taxYear = noToshikei ? tx.residential.kotei : tx.residential.total
      }
    }
    const item = {
      taxYear,
      id: Date.now(),
      title: location.title,
      lat: location.lat,
      lon: location.lon,
      prefCode,
      area,
      unit,
      price,
      rosenkaInput,
      kuiki,
      youto,
      chousei,
      costs,
      chintai: rental,
      referenceZoning,
      adjustmentVersion: 2,
      memo: imported?.src ? [imported.memo, imported.src].filter(Boolean).join(' ') : '',
      point: current ? { n: current.n, s: current.s, u: current.u, a: current.a, p: current.p, lat: current.lat, lon: current.lon } : null,
      date: new Date().toISOString().slice(0, 10),
    }
    const i = saved.findIndex((s) => s.title === item.title)
    persistSaved(
      i >= 0
        ? saved.map((s, j) => (j === i ? { ...item, id: s.id, memo: s.memo } : s))
        : [item, ...saved],
    )
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const loadSavedItem = async (it) => {
    setArea(it.area ?? '')
    setUnit(it.unit ?? 'm2')
    setPrice(it.price ?? '')
    await handleSelect({ title: it.title, lat: it.lat, lon: it.lon }, it.prefCode ?? null)
    setRosenkaInput(it.rosenkaInput ?? '') // handleSelectがリセットするので後から復元
    if (it.point && Number.isFinite(it.point.lat) && Number.isFinite(it.point.lon)) setSelectedPoint(it.point)
    setKuiki(it.kuiki ?? '')
    setYouto(it.youto ?? '')
    setChousei(it.chousei ?? CHOUSEI_DEFAULT)
    const restoredCosts = { ...EMPTY_COSTS, ...it.costs }
    setCosts(restoredCosts)
    setChintai(restoreInitialCosts(it.chintai, EMPTY_CHINTAI, restoredCosts))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 路線価: 自動値＝近隣地点からの換算（千円/㎡）。手入力があればそちらが正となり
  // 全カードの計算が実路線価ベース（isActual）に切り替わる
  const autoRosenka = adjusted ? Math.round((adjusted.p * ROSENKA_RATIO) / 1000) : null

  return (
    <div className="app">
      <header className="app-head">
        <h1>土地値チェッカー</h1>
        <p>住所から土地の評価額の目安を調べます（土地のみ・概算）</p>
      </header>

      {imported && (
        <p className="import-note">
          物件ページから取り込み: {imported.addr}
          {imported.price && ` ／ ${imported.price}万円`}
          {imported.area && ` ／ ${imported.area}${imported.unit === 'tsubo' ? '坪' : '㎡'}`}
          {imported.yachin && ` ／ 想定家賃${imported.yachin}万円/月`}
          {imported.brokerage === 'none' && ' ／ 仲介手数料不要'}
          {imported.src && (
            <>
              {' '}
              <a href={imported.src} target="_blank" rel="noopener noreferrer">元ページ</a>
            </>
          )}
        </p>
      )}

      <AddressSearch
        initialQuery={imported?.addr ?? ''}
        onSearch={handleSearch}
        candidates={candidates}
        onSelect={handleSelect}
        loading={loading}
        error={error}
        onGps={handleGps}
        gpsLoading={gpsLoading}
      />

      <QuickSummary point={adjusted} area={area} unit={unit} price={price}
        actualRosenka={actualRosenka} kuiki={kuiki} onAreaChange={setArea}
        onUnitChange={setUnit} onPriceChange={setPrice} onSave={saveCurrent}
        savedFlash={savedFlash} canSave={!!location && !!current}
        onDetails={openBuying} />
      {correction.reason && <p className="hint">{actualRosenka ? '入力した路線価を優先し、区域補正は追加しません。' : correction.reason} 区域判定は年版データによる参考値です。</p>}

      {location && (
        <p className="location-line">
          📍 {location.title}
          <span className="latlon">
            {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
            <button type="button" className="copy-btn" onClick={copyLatLon}>
              {copied ? '✓ コピー済' : 'コピー'}
            </button>
          </span>
          {needPrefSelect && (
            <select
              value=""
              onChange={(e) => selectPref(e.target.value)}
              aria-label="都道府県を選択"
            >
              <option value="" disabled>都道府県を選択</option>
              {PREFS.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          )}
        </p>
      )}

      <DetailSection id="land-details" title="土地値を詳しく調べる"
        description="地図・参考地点・用途地域・路線価・評価額"
        onToggle={(e) => { if (e.target === e.currentTarget) setMapVisible(e.currentTarget.open) }}>
      {!location && <p className="hint">住所を検索すると地図や路線価を確認できます。</p>}
      {mapVisible && location && nearest && (
        <MapPanel
          location={location}
          points={nearest}
          selected={current}
          onSelect={setSelectedPoint}
        />
      )}

      {nearest && (
        <PointList
          points={nearest}
          zoning={pointZoning}
          selected={current}
          onSelect={setSelectedPoint}
          residentialOnly={residentialOnly}
          onToggleFilter={() => {
            setResidentialOnly(!residentialOnly)
            setSelectedPoint(null)
          }}
        />
      )}

      {location && (
        <ZoningCard
          kuiki={kuiki}
          youto={youto}
          chousei={chousei}
          onKuikiChange={setKuiki}
          onYoutoChange={setYouto}
          onChouseiChange={setChousei}
          auto={zoningAuto}
          correction={correction}
        />
      )}

      {current && meta && (
        <>
          <ValuationCard
            point={adjusted}
            area={area}
            unit={unit}
            years={meta}
            actualRosenka={actualRosenka}
          />
        </>
      )}
      {location && prefCode && (
        <RosenkaCard prefCode={prefCode} title={location.title} value={rosenkaInput}
          autoValue={autoRosenka} onChange={setRosenkaInput} />
      )}
      {location && <ExternalLinks lat={location.lat} lon={location.lon} />}
      </DetailSection>

      <DetailSection id="buying-details" title="買値を検討する"
        description="販売価格との差・解体費・リフォーム費・指値の目安">
      {current && meta ? (
        <>
          <PriceCompareCard
            point={adjusted}
            area={area}
            unit={unit}
            price={price}
            actualRosenka={actualRosenka}
          />
          <SashineCard
            point={adjusted}
            area={area}
            unit={unit}
            price={price}
            actualRosenka={actualRosenka}
            costs={costs}
            onChange={changeCosts}
          />
          {!(Number(area) > 0) && <p className="hint">上の土地面積を入力すると、費用を検討できます。</p>}
        </>
      ) : <p className="hint">住所を検索すると買値を検討できます。</p>}
      </DetailSection>

      <DetailSection id="rental-details" title="貸した場合を見る"
        description="家賃・初期費用・借入・手取り・税額">
      {current && meta ? (
        <>
          {!(Number(area) > 0) && <p className="hint">上の土地面積を入力すると、賃貸収支を検討できます。</p>}
          <TaxCard
            point={adjusted}
            area={area}
            unit={unit}
            actualRosenka={actualRosenka}
            kuiki={kuiki}
          />
          <ChintaiCard
            point={adjusted}
            area={area}
            unit={unit}
            actualRosenka={actualRosenka}
            price={price}
            kuiki={kuiki}
            chintai={rental}
            costs={costs}
            onCostsChange={changeCosts}
            onChange={changeChintai}
          />
          <button type="button" className="save-btn" onClick={saveCurrent}>
            {savedFlash ? '✓ 保存しました' : '💾 この土地を保存リストへ'}
          </button>
        </>
      ) : <p className="hint">住所を検索すると賃貸収支を検討できます。</p>}
      </DetailSection>

      <SavedList
        items={saved}
        onLoad={loadSavedItem}
        onDelete={(id) => persistSaved(saved.filter((s) => s.id !== id))}
        onMemoChange={(id, memo) =>
          persistSaved(saved.map((s) => (s.id === id ? { ...s, memo } : s)))
        }
      />

      <Disclaimer years={meta} />
    </div>
  )
}
