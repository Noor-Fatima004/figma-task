import { NextResponse } from "next/server";
import { City, Country, State } from "country-state-city";
import { requireAdmin } from "@/lib/requireAdmin";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const sortNames = (names: string[]) =>
  [...new Set(names)].sort((left, right) => left.localeCompare(right));

export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  const params = new URL(request.url).searchParams;
  const level = params.get("level");

  if (level === "countries") {
    return NextResponse.json({
      items: sortNames(Country.getAllCountries().map((country) => country.name)),
    });
  }

  const countryName = params.get("country")?.trim();
  if (!countryName) return errorResponse("Country is required", 400);

  const country = Country.getAllCountries().find(
    (entry) => entry.name.toLowerCase() === countryName.toLowerCase()
  );
  if (!country) return errorResponse("Country not found", 404);

  if (level === "states") {
    return NextResponse.json({
      items: sortNames(
        State.getStatesOfCountry(country.isoCode).map((state) => state.name)
      ),
    });
  }

  if (level === "cities") {
    const stateName = params.get("state")?.trim();
    if (!stateName) {
      return NextResponse.json({
        items: sortNames(
          (City.getCitiesOfCountry(country.isoCode) ?? []).map(
            (city) => city.name
          )
        ),
      });
    }

    const state = State.getStatesOfCountry(country.isoCode).find(
      (entry) => entry.name.toLowerCase() === stateName.toLowerCase()
    );
    if (!state) return errorResponse("State / province not found", 404);

    return NextResponse.json({
      items: sortNames(
        City.getCitiesOfState(country.isoCode, state.isoCode).map(
          (city) => city.name
        )
      ),
    });
  }

  return errorResponse("Invalid location data request", 400);
}
