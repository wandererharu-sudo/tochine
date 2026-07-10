import { useEffect, useMemo, useRef, useState } from 'react'
import AddressSearch from './components/AddressSearch'
import PointList from './components/PointList'
import ValuationCard from './components/ValuationCard'
import PriceCompareCard from './components/PriceCompareCard'
import TaxCard from './components/TaxCard'
import ExternalLinks from './components/ExternalLinks'
import Disclaimer from './components/Disclaimer'
import { geocode } from './lib/geocode'
import { nearestPoints } from './lib/geo'
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
  const [gpsLoading, setGpsLoading] = useState(false)
  const prefCache = useRef({}) // {code: points[]}

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
          />
          <PriceCompareCard
            point={current}
            area={area}
            unit={unit}
            price={price}
            onPriceChange={setPrice}
          />
          <TaxCard point={current} area={area} unit={unit} />
        </>
      )}

      {location && <ExternalLinks lat={location.lat} lon={location.lon} />}

      <Disclaimer years={meta} />
    </div>
  )
}
