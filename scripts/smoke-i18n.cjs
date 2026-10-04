const base = process.env.I18N_SMOKE_URL || "http://localhost:3100";
const cases = [
  { path: "/en", locale: "en", marker: "Manage and run online exams", link: 'href="/en/login"' },
  { path: "/en", locale: "vi", expectedLocale: "en", marker: "Manage and run online exams" },
  { path: "/vi", locale: "vi", marker: "Quản lý và tổ chức thi online" },
  { path: "/en/login", locale: "en", marker: "Log in" },
  { path: "/en/signup", locale: "en", marker: "Sign up" },
];
(async () => {
  for (const { path, locale, expectedLocale = locale, marker, link } of cases) {
    const response = await fetch(`${base}${path}`, { headers: { Cookie: `NEXT_LOCALE=${locale}` } });
    const html = await response.text();
    const pass = response.ok && html.includes(`lang="${expectedLocale}"`) && html.includes(marker) && (!link || html.includes(link));
    console.log(`${pass ? "PASS" : "FAIL"} ${path} → ${expectedLocale} (cookie ${locale}, ${response.status})`);
    if (!pass) process.exitCode = 1;
  }
  for (const { path, cookie, location } of [
    { path: "/", cookie: "en", location: "/en" },
    { path: "/", cookie: "vi", location: "/vi" },
    { path: "/login", cookie: "en", location: "/en/login" },
    { path: "/dashboard", cookie: "en", location: "/en/dashboard" },
    { path: "/en/dashboard", cookie: "en", location: "/en/login" },
  ]) {
    const response = await fetch(`${base}${path}`, {
      redirect: "manual",
      headers: { Cookie: `NEXT_LOCALE=${cookie}` },
    });
    const destination = response.headers.get("location") ?? "";
    const pass = response.status >= 300 && response.status < 400 && new URL(destination, base).pathname === location;
    console.log(`${pass ? "PASS" : "FAIL"} ${path} → ${location} (${response.status})`);
    if (!pass) process.exitCode = 1;
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
