/** Where most PlusOne weddings happen, shown first so the common pick is one scroll away. */
const POPULAR = ["US", "GB", "CA", "AU", "IE", "NZ", "FR", "IT", "ES", "PT", "DE", "NL", "GR", "MX", "IN"];

// ISO 3166-1 alpha-2 codes; names come from the browser so they read naturally.
const ALL = (
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD " +
  "CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ " +
  "IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR " +
  "NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA " +
  "KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW"
).split(" ");

const names = new Intl.DisplayNames(["en"], { type: "region" });
const nameOf = (code: string) => names.of(code) ?? code;
const popular = POPULAR.map(nameOf);
const everyone = ALL.map(nameOf).sort((a, b) => a.localeCompare(b));

/** Stores the country's English name, which is what vendor searches and emails use. */
export function CountrySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (country: string) => void;
  disabled?: boolean;
}) {
  // A country typed in before this was a dropdown still shows, rather than silently blanking.
  const unknown = value && !everyone.includes(value) ? value : null;
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Choose a country</option>
      {unknown && <option value={unknown}>{unknown}</option>}
      <optgroup label="Popular">
        {popular.map((c) => <option key={`p-${c}`} value={c}>{c}</option>)}
      </optgroup>
      <optgroup label="All countries">
        {everyone.map((c) => <option key={c} value={c}>{c}</option>)}
      </optgroup>
    </select>
  );
}
