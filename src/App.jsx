import { useEffect, useMemo, useRef, useState } from 'react'
import AddressSearch from './components/AddressSearch'
import PointList from './components/PointList'
import MapPanel from './components/MapPanel'
import ValuationCard from './components/ValuationCard'
import PriceCompareCard from './components/PriceCompareCard'
import TaxCard from './components/TaxCard'
import RosenkaCard from './components/RosenkaCard'
import SavedList from './components/SavedList'
import ExternalLinks from './components/ExternalLinks'
import Disclaimer from './components/Disclaimer'
import { geocode } from './lib/geocode'
import { nearestPoints } from './lib/geo'
import { ROSENKA_RATIO } from './lib/tax'
import { PREFS, prefCodeFromAddress } from './lib/prefecture'
import './App.css'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`

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
  const [gpsLoading, setGpsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tochine_saved')) ?? []
    } catch {
      return []
    }
  })
  const prefCache = useRef({}) // {code: points[]}

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

  const handleSearch = async (query) => {
    setLoading(true)
    setError('')
    setCandidates([])
    try {
      const results = await geocode(query)
      if (results.length === 0) {
        setError('住所が見つかりませんでした。表記を変えて試すか、')
      } else if (results.length === 1) {
        handleSelect(results[0])
      } else {
        setCandidates(results)
      }
    } catch {
      setError('住所検索に失敗しました。時間をおいて再試行するか、')
    } finally {
      setLoading(false)
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
    setSelectedPoint(null)
    setRosenkaInput('') // 場所が変われば前面道路も変わるのでリセット
    setError('')
    const code = forcedCode ?? prefCodeFromAddress(cand.title)
    setPrefCode(code)
    setNeedPrefSelect(!code)
    if (!code) {
      setPoints(null)
      return
    }
    await selectPref(code)
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
    setPrefCode(code)
    setNeedPrefSelect(false)
    try {
      setPoints(await loadPref(code))
    } catch {
      setError('地価データの読み込みに失敗しました。通信環境をご確認ください。')
      setPoints(null)
    }
  }

  const nearest = useMemo(() => {
    if (!points || !location) return null
    const pool = residentialOnly ? points.filter((p) => p.u === '住宅地') : points
    return nearestPoints(pool, location.lat, location.lon, 5)
  }, [points, location, residentialOnly])

  const current = selectedPoint ?? (nearest && nearest[0]) ?? null

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
    const item = {
      id: Date.now(),
      title: location.title,
      lat: location.lat,
      lon: location.lon,
      prefCode,
      area,
      unit,
      price,
      rosenkaInput,
      memo: '',
      point: current ? { n: current.n, s: current.s, u: current.u, a: current.a, p: current.p } : null,
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 路線価: 自動値＝近隣地点からの換算（千円/㎡）。手入力があればそちらが正となり
  // 全カードの計算が実路線価ベース（isActual）に切り替わる
  const autoRosenka = current ? Math.round((current.p * ROSENKA_RATIO) / 1000) : null
  const actualRosenka = rosenkaInput !== '' ? (Number(rosenkaInput) || 0) * 1000 || null : null

  return (
    <div className="app">
      <header className="app-head">
        <h1>土地値チェッカー</h1>
        <p>住所から土地の評価額の目安を調べます（土地のみ・概算）</p>
      </header>

      <AddressSearch
        onSearch={handleSearch}
        candidates={candidates}
        onSelect={handleSelect}
        loading={loading}
        error={error}
        onGps={handleGps}
        gpsLoading={gpsLoading}
      />

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

      {location && nearest && (
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
          selected={current}
          onSelect={setSelectedPoint}
          residentialOnly={residentialOnly}
          onToggleFilter={() => {
            setResidentialOnly(!residentialOnly)
            setSelectedPoint(null)
          }}
        />
      )}

      {current && meta && (
        <>
          <ValuationCard
            point={current}
            area={area}
            unit={unit}
            onAreaChange={setArea}
            onUnitChange={setUnit}
            years={meta}
            actualRosenka={actualRosenka}
          />
          <PriceCompareCard
            point={current}
            area={area}
            unit={unit}
            price={price}
            onPriceChange={setPrice}
            actualRosenka={actualRosenka}
          />
          <TaxCard point={current} area={area} unit={unit} actualRosenka={actualRosenka} />
          <button type="button" className="save-btn" onClick={saveCurrent}>
            {savedFlash ? '✓ 保存しました' : '💾 この土地を保存リストへ'}
          </button>
        </>
      )}

      {location && prefCode && (
        <RosenkaCard
          prefCode={prefCode}
          title={location.title}
          value={rosenkaInput}
          autoValue={autoRosenka}
          onChange={setRosenkaInput}
        />
      )}

      <SavedList
        items={saved}
        onLoad={loadSavedItem}
        onDelete={(id) => persistSaved(saved.filter((s) => s.id !== id))}
        onMemoChange={(id, memo) =>
          persistSaved(saved.map((s) => (s.id === id ? { ...s, memo } : s)))
        }
      />

      {location && <ExternalLinks lat={location.lat} lon={location.lon} />}

      <Disclaimer years={meta} />
    </div>
  )
}
