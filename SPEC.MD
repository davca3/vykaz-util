# Utilita na vyplneni pracovniho vykazu
Na zaklade numbers souboru -> `vykaz_mmyy.xlsx` potrebuji vytvorit webovou aplikaci na automaticke vyplnovani podle zadanych parametru a generovani PDF/XSLX.

## Aplikace by mela umet
    - [ ] Uzivatelem navolit jmeno a prijmeni a pamatovat pro priste
    - [ ] Uzivatelem navolit cislo zamestance a pamatovat pro priste
    - [ ] vyplnit vsechna prislusna policka podle pracovnich dni v danem mesici
    - [ ] Pracovni dny, ktere spadaji na ceske pracovni svatky oznacit jako SV
    - [ ] Moznost vyplnit do pracovnich dni i podle legendy mozne znaky symbolizujici ruzne typy preruseni pracovni doby, jsou to presneji tyto:
        - Sv-svátek
        - D-dovolená
        - N-nemocenská
        - Oš-ošetřování člena rodiny
        - NV-náhradní volno celý den
        - P-překážky v práci (lékař, dárcovství krve,svatba…)
        - M-peněž.pomoc v mateřství
        - RD-rodičovská dovolená
        - NP-neplacené volno
    - [ ] Moznost vybirat dny dovolene v pracovnich dnech
        - [ ] Mela by byt moznost i specifikovat hodiny, ktere jsem pri dovolene stravil (Mohu napriklad mit pul den dovolenou = 4hodiny + nemam narok na obedovou pauzu)
    - [ ] Moznost vybirat dny, kdy jsem mel prescas a zapisovat do radku Prescas hod v tomto mesici do dalsich mesicu
    - [ ] Moznost vybirat dny a hodiny, kolik si chci vybrat nahradniho volna z minulych mesicu
        - [ ] Vsechny tato pole
    - [ ] Moznost vybirat prescas hodiny, ktere chci proplatit
    - [ ] Vsechny potrebne vypocty provadet v tabulkach
    - [ ] Mit moznost vybirat dny propustky, kolik hodin a duvod preruseni + preruseni pracovni doby od - do
    - [ ] Scitat odpracovane hodiny, Cerpani nahradniho volna, Prescasove hodiny tento mesic, Prescasove hodiny k propaceni a Propustky
    - [ ] Zapisovat relevantni hodnoty pod hlavni tabulkou a radne pricitat/odcitat - Napriklad Odpracovano v tomto mesici by melo zrcadlit hodnoty
    - [ ] Zapisovat relevantni hodnoty v tabulce "hodiny k proplaceni"
    - [ ] Zapisovat relevantni hodnoty a ukladat hodnoty do tabulky "NV - Nahradni volno", kde se pricita a odcita NV k proplaceni s minulymi mesici, zapisuji se zde Cerpani
    - [ ] Zapisovat relevantni hodnoty "FPD" = Fond pracovni doby, kde se sectou pracovni dny, Svatky a pote celkem.
    - [ ] Zapsat a pamatovat cislo zamestance
    - [ ] Volit obdobi za ktery mesic chci vyplnovat vykaz
    - [ ] Pri vyberu blokovat vikendy a svatky = nepracovni dny
    - [ ] Pri exportu do PDF potrebuji, aby se exportoval jako `prijmeni_mmyy.pdf`
    - [ ] Mit moznost exportu do XLSX s vyplnenymi hodnotami jako `prijmeni_mmyy.xlsx`
    - [ ] Pokud neni prijmeni vyplneno, dej tam nejaky fallback (treba vykaz_mmyy.xlsx/pdf)
    - [ ] Dejme moznost nahrat obrazek s podpisem zamestance a ulozit/pamatovat si ho pro priste
