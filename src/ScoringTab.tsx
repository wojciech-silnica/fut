export function ScoringTab() {
  return (
    <div className="rules-wrap">
      <h2 className="stage-header">Punktacja</h2>

      <article className="rules-card">
        <header className="rules-hero">
          <h3>REGULAMIN LIGI GOJÓW</h3>
        </header>

        <section className="rules-section">
          <h4>1. Typowanie meczów</h4>
          <p>
            Typy należy przesłać <strong>najpóźniej do godziny 23:59 dnia poprzedzającego mecze</strong> - ale w sumie nie jestem pewien bo nie ogarniam stref czasowych xd.
          </p>
          <p>Po upływie terminu typy są ostateczne i nie mogą zostać zmienione.</p>
          <p>Każdy uczestnik typuje <strong>dokładny wynik meczu</strong> (np. 2:1, 0:0, 3:2).</p>
        </section>

        <section className="rules-section">
          <h4>2. Punktacja za jeden mecz</h4>

          <div className="rules-point-grid">
            <article className="rules-point-card">
              <h5>6 PKT - IDEALNY REMIS (SUPER BONUS)</h5>
              <p>Trafiony dokładny wynik remisu.</p>
              <p className="rules-example-label">Przykład:</p>
              <ul>
                <li>Typ: 2:2</li>
                <li>Wynik: 2:2</li>
              </ul>
            </article>

            <article className="rules-point-card">
              <h5>5 PKT - IDEALNY WYNIK</h5>
              <p>Trafiony dokładny wynik meczu zakończonego zwycięstwem jednej z drużyn.</p>
              <p className="rules-example-label">Przykład:</p>
              <ul>
                <li>Typ: 2:1</li>
                <li>Wynik: 2:1</li>
              </ul>
            </article>

            <article className="rules-point-card">
              <h5>3 PKT - ZWYCIĘZCA + RÓŻNICA BRAMEK</h5>
              <p>Prawidłowo wskazany zwycięzca oraz różnica bramek, ale nie dokładny wynik.</p>
              <p className="rules-example-label">Przykłady:</p>
              <ul>
                <li>Typ: 2:0 -&gt; Wynik: 3:1</li>
                <li>Typ: 1:3 -&gt; Wynik: 0:2</li>
              </ul>
            </article>

            <article className="rules-point-card">
              <h5>3 PKT - „ŚLEPY” REMIS</h5>
              <p>Prawidłowo wskazany remis, ale bez trafienia dokładnej liczby bramek.</p>
              <p className="rules-example-label">Przykłady:</p>
              <ul>
                <li>Typ: 1:1 -&gt; Wynik: 0:0</li>
                <li>Typ: 2:2 -&gt; Wynik: 3:3</li>
              </ul>
            </article>

            <article className="rules-point-card">
              <h5>2 PKT - TYLKO ZWYCIĘZCA</h5>
              <p>Prawidłowo wskazana drużyna wygrywająca mecz, ale bez trafienia wyniku ani różnicy bramek.</p>
              <p className="rules-example-label">Przykłady:</p>
              <ul>
                <li>Typ: 1:0 -&gt; Wynik: 3:0</li>
                <li>Typ: 2:1 -&gt; Wynik: 5:3</li>
              </ul>
            </article>

            <article className="rules-point-card">
              <h5>0 PKT - CAŁKOWITE PUDŁO</h5>
              <p>Nieprawidłowo wskazany rezultat meczu.</p>
              <p className="rules-example-label">Przykłady:</p>
              <ul>
                <li>Typowana wygrana jednej drużyny, a wygrywa druga.</li>
                <li>Typowana wygrana jednej drużyny, a mecz kończy się remisem.</li>
                <li>Typowany remis, a mecz kończy się zwycięstwem jednej z drużyn.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="rules-section">
          <h4>3. Zasady fazy pucharowej</h4>
          <p>
            W fazie pucharowej wynik meczu liczony jest <strong>po 120 minutach gry (90 minut + ewentualna dogrywka)</strong>.
          </p>
          <p>Rzuty karne nie są traktowane jako gole i nie zmieniają wyniku meczu.</p>

          <div className="rules-callout">
            <h5>Mecze zakończone remisem po 120 minutach</h5>
            <p>Jeżeli po 120 minutach utrzymuje się remis i o awansie decydują rzuty karne:</p>
            <ul>
              <li>uczestnicy typujący remis otrzymują punkty zgodnie ze standardowymi zasadami:</li>
              <li>6 pkt za idealny remis,</li>
              <li>3 pkt za „ślepy” remis,</li>
              <li>uczestnicy typujący zwycięstwo drużyny, która ostatecznie awansowała po rzutach karnych, otrzymują <strong>1 punkt bonusowy</strong>,</li>
              <li>nie są przyznawane punkty za zwycięzcę ani za różnicę bramek, ponieważ wynik po 120 minutach pozostaje remisem.</li>
            </ul>
          </div>

          <div className="rules-example-block">
            <p className="rules-example-label">Przykład</p>
            <p>Po 120 minutach: 1:1</p>
            <p>Po karnych awansuje Hiszpania.</p>

            <div className="rules-table-wrap">
              <table className="rules-example-table">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Punkty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1:1</td>
                    <td>6 pkt</td>
                  </tr>
                  <tr>
                    <td>2:2</td>
                    <td>3 pkt</td>
                  </tr>
                  <tr>
                    <td>2:1 Hiszpania</td>
                    <td>1 pkt</td>
                  </tr>
                  <tr>
                    <td>3:1 Hiszpania</td>
                    <td>1 pkt</td>
                  </tr>
                  <tr>
                    <td>1:2 Francja</td>
                    <td>0 pkt</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>Punkt bonusowy za awans po karnych podlega mnożnikowi rundy.</p>
          </div>
        </section>

        <section className="rules-section">
          <h4>4. Mnożniki fazy pucharowej</h4>
          <p>Aby utrzymać emocje do samego końca turnieju, mecze fazy pucharowej mają zwiększoną wartość punktową.</p>

          <ul className="rules-list">
            <li><strong>1/16 finału i 1/8 finału</strong> - wszystkie zdobyte punkty ×2</li>
            <li><strong>Ćwierćfinały i półfinały</strong> - wszystkie zdobyte punkty ×3</li>
            <li><strong>Finał</strong> - wszystkie zdobyte punkty ×4</li>
          </ul>

          <div className="rules-example-block">
            <p className="rules-example-label">Przykłady</p>
            <ul>
              <li>Idealny wynik w finale: 5 × 4 = 20 pkt</li>
              <li>Idealny remis w finale: 6 × 4 = 24 pkt</li>
              <li>Bonus za awans po karnych w finale: 1 × 4 = 4 pkt</li>
            </ul>
          </div>
        </section>

        <section className="rules-section">
          <h4>5. Klasyfikacja generalna</h4>
          <p>Po każdym meczu uczestnicy otrzymują punkty zgodnie z regulaminem.</p>
          <p>W klasyfikacji generalnej liczy się suma wszystkich zdobytych punktów.</p>
        </section>

        <section className="rules-section">
          <h4>6. Rozstrzyganie remisów w tabeli</h4>
          <p>Jeżeli dwóch lub więcej uczestników zakończy rozgrywki z identyczną liczbą punktów, o wyższym miejscu decydują kolejno:</p>

          <ol className="rules-list rules-ordered-list">
            <li>Większa liczba punktów zdobytych w finale.</li>
            <li>Większa liczba punktów zdobytych w półfinałach.</li>
            <li>Większa liczba punktów zdobytych w ćwierćfinałach.</li>
            <li>Większa liczba punktów zdobytych w 1/8 i 1/16 finału.</li>
            <li>Większa liczba punktów zdobytych w fazie grupowej.</li>
            <li>Jeżeli nadal występuje remis - miejsca są współdzielone lub uczestnicy ustalają dodatkowe rozstrzygnięcie.</li>
          </ol>
        </section>

        <section className="rules-section">
          <p>W przypadku zauważenia błędu w naliczaniu punktów uczestnik powinien zgłosić go organizatorowi niezwłocznie po publikacji wyników danej kolejki.</p>
          <p>Powodzenia</p>
        </section>
      </article>
    </div>
  )
}