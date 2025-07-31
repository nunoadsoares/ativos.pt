// packages/webapp/src/components/DefaultRiskMap.tsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

const MAP_FILE = '/maps/portugal-nuts2.json';
const DATA_FILE = '/data/map_default_risk.json';

const REGION_API_TO_MAP_NAME: Record<string, string> = {
  "Norte (NUTS II)": "Norte",
  "Douro (NUTS III)": "Norte",
  "Tâmega e Sousa (NUTS III)": "Norte",
  "Terras de Trás-os-Montes (NUTS III)": "Norte",
  "Centro (NUTS II)": "Centro",
  "Área Metropolitana de Lisboa (NUTS II)": "Lisboa",
  "Grande Lisboa (NUTS II)": "Lisboa",
  "Grande Lisboa (NUTS III)": "Lisboa",
  "Península de Setúbal (NUTS II)": "Lisboa",
  "Alentejo (NUTS II)": "Alentejo",
  "Lezíria do Tejo (NUTS III)": "Alentejo",
  "Algarve (NUTS II)": "Algarve",
};

type RegionData = { value: number | null; type: string };
type TooltipData = {
  regionName: string;
  subRegions: { name: string; data: RegionData }[];
};

const TOOLTIP_OFFSET_X = 24;
const TOOLTIP_OFFSET_Y = 0;
const TOOLTIP_MIN_WIDTH = 220;
const TOOLTIP_MAX_WIDTH = 330;

export default function DefaultRiskMap() {
  const [data, setData] = useState<Record<string, RegionData>>({});
  const [tooltip, setTooltip] = useState<{ content: TooltipData | null; x: number; y: number }>({ content: null, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(DATA_FILE)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const groupedDataByMapName = useMemo(() => {
    const groups: Record<string, { name: string; data: RegionData }[]> = {
      Norte: [],
      Centro: [],
      Lisboa: [],
      Alentejo: [],
      Algarve: []
    };
    const seen: Record<string, Set<string>> = {
      Norte: new Set(),
      Centro: new Set(),
      Lisboa: new Set(),
      Alentejo: new Set(),
      Algarve: new Set()
    };

    for (const [apiRegion, regionData] of Object.entries(data)) {
      const mapName = REGION_API_TO_MAP_NAME[apiRegion];
      if (!mapName) continue;
      const cleanName = apiRegion.replace(/\s*\(NUTS [II|III]+\)$/, '');
      if (!seen[mapName].has(cleanName)) {
        groups[mapName].push({ name: cleanName, data: regionData });
        seen[mapName].add(cleanName);
      }
    }

    return groups;
  }, [data]);

  // --- Posicionamento do tooltip limitado ao container ---
  function getTooltipStyle() {
    if (!containerRef.current || !tooltip.content) return { display: "none" };

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    // tooltip.x/y são relativos ao container, ajusta com offset
    let left = tooltip.x + TOOLTIP_OFFSET_X;
    let top = tooltip.y + TOOLTIP_OFFSET_Y;

    // largura real do container
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // estimar altura do tooltip (fixo, pode afinar se quiseres)
    const tooltipWidth = Math.max(TOOLTIP_MIN_WIDTH, Math.min(TOOLTIP_MAX_WIDTH, containerWidth * 0.8));
    const tooltipHeight = Math.max(130, Math.min(250, containerHeight * 0.5));

    // Não deixar sair pela direita
    if (left + tooltipWidth > containerWidth) {
      left = containerWidth - tooltipWidth - 8;
    }
    // Nem sair em cima
    if (top < 0) {
      top = 8;
    }
    // Nem em baixo
    if (top + tooltipHeight > containerHeight) {
      top = containerHeight - tooltipHeight - 8;
    }

    return {
      left: left,
      top: top,
      minWidth: TOOLTIP_MIN_WIDTH,
      maxWidth: TOOLTIP_MAX_WIDTH,
      width: "auto",
      position: "absolute" as const,
      zIndex: 20,
      pointerEvents: "none"
    };
  }

  if (Object.keys(data).length === 0) {
    return <div className="text-center py-10">A carregar mapa...</div>;
  }

  return (
    <div ref={containerRef} className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-8.5, 40], scale: 5000 }}
        style={{ width: '100%', height: 'auto' }}
      >
        <ZoomableGroup center={[-8.2, 39.7]} zoom={0.9}>
          <Geographies geography={MAP_FILE}>
            {({ geographies }) =>
              geographies.map(geo => {
                const mapRegionName = geo.properties.name as string;
                const subRegions = groupedDataByMapName[mapRegionName] || [];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={e => {
                      if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setTooltip({
                          content: { regionName: mapRegionName, subRegions },
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                    }}
                    onMouseMove={e => {
                      if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setTooltip(prev => ({
                          ...prev,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        }));
                      }
                    }}
                    onMouseLeave={() =>
                      setTooltip({ content: null, x: 0, y: 0 })
                    }
                    style={{
                      default: {
                        fill: '#047857',
                        stroke: '#FFF',
                        strokeWidth: 0.7,
                        outline: 'none',
                        transition: 'fill 0.3s'
                      },
                      hover: { fill: '#059669', outline: 'none' },
                      pressed: { fill: '#065f46', outline: 'none' }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip sempre bem posicionado */}
      {tooltip.content && (
        <div
          className="
            p-3 text-sm bg-gray-900 dark:bg-gray-800 text-white
            rounded-lg shadow-xl opacity-95
            max-w-xs whitespace-normal overflow-auto
            font-sans
          "
          style={getTooltipStyle()}
        >
          <strong className="block mb-2 pb-1 border-b border-gray-600 font-bold">
            {tooltip.content.regionName}
          </strong>
          {tooltip.content.subRegions.length > 0 ? (
            <table className="table-auto w-full mt-2">
              <tbody>
                {tooltip.content.subRegions.map(sr => (
                  <tr key={sr.name}>
                    <td className="py-0.5 pr-2 text-gray-300 text-left align-top">
                      {sr.name}:
                    </td>
                    <td className="py-0.5 font-bold text-white text-right align-top">
                      {sr.data.value !== null
                        ? `${sr.data.value}%`
                        : 'N/A'}
                      <span
                        className={
                          `text-xs ml-1 font-normal ` +
                          (sr.data.type === 'Habitação'
                            ? 'text-green-400'
                            : 'text-yellow-400')
                        }
                      >
                        ({sr.data.type})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Sem dados disponíveis para esta região.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
