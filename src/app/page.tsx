"use client";

import { useState } from "react";
import { FaInstagram, FaFacebookF, FaTwitter, FaYoutube } from "react-icons/fa";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* NAVBAR */}
      <div className="w-full bg-white">
        <nav className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-8 lg:px-[5%] text-[#263238]">
          <div className="flex flex-1 items-center gap-2 sm:gap-[10px]">
            <img src="/Icon.jpg" alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-[clamp(0.9rem,0.7rem+0.5vw,1.125rem)] font-semibold">Nextcent</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden flex-1 items-center justify-end gap-4 md:flex lg:gap-6">
            <ul className="flex list-none gap-4 lg:gap-9">
              <li>
                <a href="#" className="text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium text-[#263238] no-underline">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium text-[#263238] no-underline">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium text-[#263238] no-underline">
                  Community
                </a>
              </li>
              <li>
                <a href="#" className="text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium text-[#263238] no-underline">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium text-[#263238] no-underline">
                  Pricing
                </a>
              </li>
            </ul>
            <a href="#" className="text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium no-underline text-[#4CAF4F] hover:text-green-700 transition duration-300">
              login
            </a>
            <button className="flex flex-row items-center gap-1 rounded bg-[#4CAF50] px-4 py-2 lg:px-5 text-[clamp(0.75rem,0.65rem+0.3vw,0.9375rem)] text-white transition duration-300 hover:bg-[#388E3C]">
              <p>sign up</p>
              <img src="/dr.png" alt="" className="w-[15px]" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex flex-col justify-center items-center gap-[5px] md:hidden"
          >
            <span
              className={`block h-[2px] w-6 bg-[#263238] transition-transform ${
                menuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-6 bg-[#263238] transition-opacity ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-[2px] w-6 bg-[#263238] transition-transform ${
                menuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </button>
        </nav>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 md:hidden">
            <ul className="flex flex-col gap-4">
              <li>
                <a href="#" className="text-sm font-medium text-[#263238] no-underline">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-sm font-medium text-[#263238] no-underline">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-sm font-medium text-[#263238] no-underline">
                  Community
                </a>
              </li>
              <li>
                <a href="#" className="text-sm font-medium text-[#263238] no-underline">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm font-medium text-[#263238] no-underline">
                  Pricing
                </a>
              </li>
            </ul>
            <button className="flex w-fit flex-row items-center gap-1 rounded bg-[#4CAF50] px-5 py-2 text-sm text-white transition duration-300 hover:bg-[#388E3C]">
              <p>Register</p>
              <img src="/dr.png" alt="" className="w-[15px]" />
            </button>
          </div>
        )}
      </div>

      {/* HERO — FULL WIDTH BACKGROUND */}
      <div className="w-full bg-[#F5F7FA] mb-7">
        <div className="mx-auto flex w-full min-h-fit lg:min-h-[450px] flex-col-reverse flex-col sm:flex-row items-center justify-around gap-8 sm:gap-10 lg:gap-[72px] px-4 sm:px-10 lg:px-[100px] py-8 sm:py-10 lg:py-[67px]">
          <div className="flex w-full lg:w-[490px] flex-col items-center lg:items-start gap-4 sm:gap-5 lg:gap-[22px] text-center lg:text-left">
            <h1 className="text-[clamp(1.75rem,1.1rem+3vw,2.8125rem)] font-semibold leading-[1.15] text-[#4D4D4D]">
              Lessons and insights
            </h1>
            <span className="text-[clamp(1.75rem,1.1rem+3vw,2.8125rem)] font-semibold leading-[1.15] text-[#4CAF4F]">
              From 8 years
            </span>
            <p className="text-[clamp(0.8125rem,0.7rem+0.4vw,0.9375rem)] font-normal leading-relaxed text-[#717171] max-w-[420px]">
              Where to grow your business as a photographer: site or social media?
            </p>
            <button className="w-fit px-6 py-3 lg:w-[128px] lg:h-[52px] gap-[6.96px] rounded-[3px] bg-[#4CAF50] lg:pt-[10px] lg:pr-10 lg:pb-[10px] lg:pl-[22px] text-white text-sm lg:text-base transition duration-300 hover:bg-[#388E3C]">
              Register
            </button>
          </div>
          <div>
            <img
              src="/Illustration-removebg-preview.png"
              alt=""
              className="w-[160px] h-[160px] sm:w-[220px] sm:h-[220px] lg:w-[282px] lg:h-[283px]"
            />
          </div>
        </div>
      </div>

      {/* CLIENTS */}
      <div className="mx-auto my-6 sm:my-[30px] w-full max-w-[1140px] h-auto gap-[11px] px-4 sm:px-10 lg:px-[100px]">
        <div className="mx-auto flex w-full max-w-[773px] flex-col gap-2 sm:gap-[6px]">
          <h1 className="text-center text-[clamp(1.25rem,1rem+1.2vw,1.5654rem)] font-semibold leading-snug text-[#4D4D4D]">
            Our Clients
          </h1>
          <p className="text-center text-[clamp(0.75rem,0.7rem+0.2vw,0.8125rem)] font-normal leading-[17px] text-[#717171]">
            We have been working with some Fortune 500+ clients
          </p>
        </div>
        <div className="mt-4 lg:mt-[11px] grid grid-cols-3 sm:grid-cols-4 lg:flex lg:w-full lg:flex-row items-center justify-items-center lg:justify-between gap-6 lg:gap-0">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} className="justify-between">
              <img
                src={`/Logo__${n}_-removebg-preview.png`}
                alt=""
                className="lg:my-[17px] lg:mx-[2px] w-[28px] h-[28px] sm:w-[33px] sm:h-[33px] rounded-[6px]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* COMMUNITY / WHO IT'S FOR */}
      <div className="mx-auto mt-7 flex w-full max-w-[1140px] h-auto flex-col gap-6 sm:gap-8 lg:gap-3 px-4 sm:px-10 lg:px-0">
        <div className="w-full h-auto gap-[6px]">
          <h1 className="mx-auto h-auto w-full text-center text-[clamp(1.25rem,1rem+1.2vw,1.5625rem)] font-semibold leading-snug text-[#4D4D4D]">
            Manage your entire community in a single system
          </h1>
          <p className="mt-2 h-auto w-full text-center text-sm font-normal leading-relaxed text-[#263238]">
            Who is Nextcent suitable for?
          </p>
        </div>

        <div className="flex w-full h-auto flex-col flex-col sm:flex-row justify-between gap-6 lg:gap-6 lg:px-[100px]">
          <div className="flex w-full lg:w-1/3 h-auto flex-col items-center gap-[6px] rounded-[6px] bg-white py-4 px-5 lg:py-[17px] lg:px-[22px]">
            <div className="flex w-full lg:w-[186px] h-auto flex-col gap-[11px]">
              <div className="mx-auto w-[40px] h-[35px] sm:w-[45px] sm:h-[39px]">
                <img src="/Icon.png" alt="" />
              </div>
              <h1 className="h-auto w-full text-center text-[clamp(1rem,0.85rem+0.7vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                Membership Organisations
              </h1>
            </div>
            <div className="w-full lg:w-[175px] h-auto gap-[5.57px]">
              <p className="h-auto w-full text-center text-[clamp(0.6875rem,0.6rem+0.3vw,0.8125rem)] font-normal leading-relaxed text-[#717171]">
                Our membership management software provides full automation of
                membership renewals and payments
              </p>
            </div>
          </div>

          <div className="flex w-full lg:w-1/3 h-auto flex-col items-center gap-[6px] rounded-[6px] bg-white py-4 px-5 lg:py-[17px] lg:px-[22px]">
            <div className="flex w-full lg:w-[185px] h-auto flex-col gap-[11px]">
              <div className="mx-auto w-[40px] h-[35px] sm:w-[45px] sm:h-[39px]">
                <img src="/Icon.png" alt="" />
              </div>
              <h1 className="h-auto w-full text-center text-[clamp(1rem,0.85rem+0.7vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                National Associations
              </h1>
            </div>
            <div className="w-full lg:w-[167px] h-auto gap-[5.57px]">
              <p className="h-auto w-full text-center text-[clamp(0.6875rem,0.6rem+0.3vw,0.8125rem)] font-normal leading-relaxed text-[#717171]">
                Our membership management software provides full automation of
                membership renewals and payments
              </p>
            </div>
          </div>

          <div className="flex w-full lg:w-1/3 h-auto flex-col items-center gap-[6px] rounded-[6px] bg-white py-4 px-5 lg:py-[17px] lg:px-[22px]">
            <div className="flex w-full lg:w-[186px] h-auto flex-col gap-[11px]">
              <div className="mx-auto w-[40px] h-[35px] sm:w-[45px] sm:h-[39px]">
                <img src="/Icon.png" alt="" />
              </div>
              <h1 className="h-auto w-full text-center text-[clamp(1rem,0.85rem+0.7vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                Clubs And <br /> Groups
              </h1>
            </div>
            <div className="w-full lg:w-[175px] h-auto gap-[5.57px]">
              <p className="h-auto w-full text-center text-[clamp(0.6875rem,0.6rem+0.3vw,0.8125rem)] font-normal leading-relaxed text-[#717171]">
                Our membership management software provides full automation of
                membership renewals and payments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 1 */}
      <div className="mx-auto mt-6 lg:mt-[26px] w-full max-w-[1140px] h-auto flex flex-col gap-8 lg:gap-[33px] px-4 sm:px-10 lg:px-0">
        {/* UNLOCK BLOCK 1 */}
        <div className="w-full h-auto">
          <div className="flex w-full h-auto flex-col sm:flex-row items-center gap-8 lg:gap-16 justify-center lg:px-[100px]">
            <div className="w-full max-w-[308px] lg:w-[308px] h-auto flex-shrink-0">
              <img src="/craiyon_111152_image.png" alt="" className="w-full h-auto" />
            </div>
            <div className="flex w-full h-auto flex-col gap-4 lg:gap-[22px]">
              <div className="flex w-full h-auto flex-col gap-3 lg:gap-[11px]">
                <h1 className="h-auto m-auto sm:m-0 text-[clamp(1.125rem,0.9rem+1vw,1.5654rem)] font-semibold leading-snug text-[#4D4D4D]">
                  The unseen of spending three years at Pixelgrade
                </h1>
                <p className="h-auto m-auto sm:m-0 text-[clamp(0.6875rem,0.6rem+0.3vw,0.8125rem)] font-normal leading-relaxed text-[#717171]">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit
                  amet justo ipsum. Sed accumsan quam vitae est varius fringilla.
                  Pellentesque placerat vestibulum lorem sed porta. Nullam mattis
                  tristique iaculis. Nullam pulvinar sit amet risus pretium
                  auctor. Etiam quis massa pulvinar, aliquam quam vitae, tempus
                  sem. Donec elementum pulvinar odio.
                </p>
              </div>
              <div className="w-fit m-auto sm:m-0 lg:w-[156px]  h-9 gap-[7px] rounded-[3px] bg-[#4CAF4F] px-[22px] py-[7px] text-white text-sm">
                Learn more
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS — FULL WIDTH BACKGROUND */}
      <div className="w-full bg-[#F5F7FA] my-4 lg:my-[33px]">
        <div className="mx-auto flex w-full max-w-[1140px] h-auto flex-col lg:flex-row justify-between gap-8 lg:gap-16 py-8 lg:pt-[45px] lg:pb-[46px] px-4 sm:px-10 lg:px-[100px]">
          <div className="w-full lg:w-[375px] h-auto gap-[6px] flex-shrink-0">
            <div className="flex w-full h-auto flex-col gap-[6px]">
              <h1 className="text-[clamp(1.125rem,0.9rem+1vw,1.5625rem)] m-auto lg:m-0 font-semibold leading-snug text-[#4D4D4D]">
                Helping a local
              </h1>
              <span className="text-[clamp(1.125rem,0.9rem+1vw,1.5625rem)] m-auto lg:m-0 font-semibold leading-snug text-[#4CAF4F]">
                business reinvent itself
              </span>
              <p className="mb-2 lg:mb-[10px] h-auto m-auto lg:m-0 text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-normal leading-relaxed text-[#18191F]">
                We reached here with our hard work and dedication
              </p>
            </div>
          </div>

          <div className="flex w-full lg:w-[376px] h-auto flex-col gap-6 lg:gap-7">
            <div className="flex h-auto flex-row justify-between gap-4 lg:gap-[21px]">
              <div className="flex w-1/2 lg:w-[177px] h-auto flex-row justify-start lg:justify-between gap-[11px]">
                <div className="w-[28px] h-[28px] sm:w-[33px] sm:h-[33px] flex-shrink-0">
                  <img src="/Icon (3).png" alt="" />
                </div>
                <div className="flex w-auto lg:w-[133px] h-auto flex-col">
                  <h1 className="h-auto m-auto lg:m-0 text-[clamp(0.875rem,0.75rem+0.6vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                    2,245,341
                  </h1>
                  <p className="h-auto m-auto lg:m-0 text-[clamp(0.6875rem,0.6rem+0.2vw,0.75rem)] font-normal leading-relaxed text-[#717171]">
                    Members
                  </p>
                </div>
              </div>
              <div className="flex w-1/2 lg:w-[177px] h-auto flex-row justify-start lg:justify-between gap-[11px]">
                <div className="w-[28px] h-[28px] sm:w-[33px] sm:h-[33px] flex-shrink-0">
                  <img src="/Icon (4).png" alt="" />
                </div>
                <div className="flex w-auto lg:w-[133px] h-auto flex-col">
                  <h1 className="h-auto m-auto lg:m-0 text-[clamp(0.875rem,0.75rem+0.6vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                    46,328
                  </h1>
                  <p className="h-auto m-auto sm:m-0 text-[clamp(0.6875rem,0.6rem+0.2vw,0.75rem)] font-normal leading-relaxed text-[#717171]">
                    Clubs
                  </p>
                </div>
              </div>
            </div>
            <div className="flex h-auto flex-row justify-between gap-4 lg:gap-[21px]">
              <div className="flex w-1/2 lg:w-[177px] h-auto flex-row justify-start lg:justify-between gap-[11px]">
                <div className="w-[28px] h-[28px] sm:w-[33px] sm:h-[33px] flex-shrink-0">
                  <img src="/Icon (5).png" alt="" />
                </div>
                <div className="flex w-auto lg:w-[133px] h-auto flex-col">
                  <h1 className="h-auto text-[clamp(0.875rem,0.75rem+0.6vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                    828,867
                  </h1>
                  <p className="h-auto text-[clamp(0.6875rem,0.6rem+0.2vw,0.75rem)] font-normal leading-relaxed text-[#717171]">
                    Event Bookings
                  </p>
                </div>
              </div>
              <div className="flex w-1/2 lg:w-[177px] h-auto flex-row justify-start lg:justify-between gap-[11px]">
                <div className="w-[28px] h-[28px] sm:w-[33px] sm:h-[33px] flex-shrink-0">
                  <img src="/Vector.png" alt="" />
                </div>
                <div className="flex w-auto lg:w-[133px] h-auto flex-col">
                  <h1 className="h-auto text-[clamp(0.875rem,0.75rem+0.6vw,1.1875rem)] font-bold leading-snug text-[#4D4D4D]">
                    1,926,436
                  </h1>
                  <p className="h-auto text-[clamp(0.6875rem,0.6rem+0.2vw,0.75rem)] font-normal leading-relaxed text-[#717171]">
                    Payments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 2 */}
      <div className="mx-auto w-full max-w-[1140px] h-auto flex flex-col gap-8 lg:gap-[33px] px-4 sm:px-10 lg:px-0">
        {/* UNLOCK BLOCK 2 */}
        <div className="w-full h-auto">
          <div className="flex w-full h-auto flex-row-reverse lg:flex-row items-center gap-8 lg:gap-16 justify-center lg:px-[100px]">
            <div className="w-full max-w-[260px] lg:w-auto h-auto flex-shrink-0">
              <img src="/pana-removebg-preview.png" alt="" className="w-full h-auto lg:h-[302px] lg:w-auto" />
            </div>
            <div className="flex w-full h-auto flex-col  gap-4 lg:gap-[22px]">
              <div className="w-full h-auto gap-[11px]">
                <h1 className="h-auto m-auto lg:m-0 lg:text-4xl text-[clamp(1.125rem,0.9rem+1vw,1.5654rem)] font-semibold leading-snug text-[#4D4D4D]">
                  How to design your site footer like we did
                </h1>
                <p className="mt-2 m-auto sm:m-0 h-auto text-[clamp(0.6875rem,0.6rem+0.3vw,0.8125rem)] font-normal leading-relaxed text-[#717171]">
                  Donec a eros justo. Fusce egestas tristique ultrices. Nam
                  tempor, augue nec tincidunt molestie, massa nunc varius arcu,
                  at scelerisque elit erat a magna. Donec quis erat at libero
                  ultrices mollis. In hac habitasse platea dictumst. Vivamus
                  vehicula leo dui, at porta nisi facilisis finibus. In euismod
                  augue vitae nisi ultricies, non aliquet urna tincidunt.
                  Integer in nisi eget nulla commodo faucibus efficitur quis
                  massa. Praesent felis est, finibus et nisi ac, hendrerit
                  venenatis libero. Donec consectetur faucibus ipsum id gravida.
                </p>
              </div>
              <div className="w-fit m-auto sm:m-0 lg:w-[125px] h-9 gap-[7px] rounded-[3px] bg-[#4CAF4F] px-[22px] py-[10px] text-white text-sm">
                Learn more
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMERS / TESTIMONIAL — FULL WIDTH BACKGROUND */}
      <div className="w-full bg-[#F5F7FA] my-4 lg:my-[34px]">
        <div className="mx-auto flex w-full max-w-[1140px] h-auto flex-col sm:flex-row justify-center items-center gap-8 lg:gap-[54px] py-8 lg:pt-[22px] lg:pb-[22px] px-4 sm:px-10 lg:px-[100px]">
          <div className="mx-auto lg:mx-0 flex-shrink-0">
            <img
              src="/image 9.png"
              alt=""
              className="w-[160px] h-[160px] sm:w-[226px] sm:h-[227px] rounded-[6px] shadow-[0px_5.57px_11.14px_0px_#ABBED166]"
            />
          </div>
          <div className="flex w-full h-auto flex-col gap-4 lg:gap-[22px]">
            <div className="flex w-full h-auto flex-col gap-3 lg:gap-[11px]">
              <p className="h-auto w-full align-middle text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-medium leading-relaxed text-[#717171]">
                Maecenas dignissim justo eget nulla rutrum molestie. Maecenas
                lobortis sem dui, vel rutrum risus tincidunt ullamcorper. Proin
                eu enim metus. Vivamus sed libero ornare, tristique quam in,
                gravida enim. Nullam ut molestie arcu, at hendrerit elit. Morbi
                laoreet elit at ligula molestie, nec molestie mi blandit.
                Suspendisse cursus tellus sed augue ultrices, quis tristique
                nulla sodales. Suspendisse eget lorem eu turpis vestibulum
                pretium. Suspendisse potenti. Quisque malesuada enim sapien,
                vitae placerat ante feugiat eget. Quisque vulputate odio neque,
                eget efficitur libero condimentum id. Curabitur id nibh id sem
                dignissim finibus ac sit amet magna.
              </p>
              <div className="w-full lg:w-[521px] h-auto gap-[6px]">
                <h1 className="h-auto w-full align-middle text-sm font-semibold leading-[19px] text-[#4CAF4F]">
                  Tim Smith
                </h1>
                <p className="h-auto w-full align-middle text-xs font-normal leading-[17px] text-[#89939E]">
                  British Dragon Boat Racing Association
                </p>
              </div>
            </div>
            <div className="flex w-full lg:w-[521px] h-auto flex-col sm:flex-row items-center gap-4 lg:gap-[22px]">
              <div className="grid grid-cols-3 sm:flex w-full lg:w-[343px] h-auto flex-row justify-items-center sm:justify-between gap-6 sm:gap-[29px]">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="w-[28px] h-[28px] sm:w-[33px] sm:h-[33px] rounded-[6px]">
                    <img src={`/Logo__${n}_-removebg-preview.png`} alt="" />
                  </div>
                ))}
              </div>
              <div className="w-fit h-auto gap-[6px] p-[6px] flex items-center">
                <p className="h-auto w-auto align-middle text-sm font-semibold leading-[19px] text-[#4CAF4F]">
                  Meet all customers
                </p>
                <img src="/dr.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 3 */}
      <div className="mx-auto w-full max-w-[1140px] h-auto flex flex-col gap-8 lg:gap-[33px] px-4 sm:px-10 lg:px-0">
        {/* BLOG / UPDATES */}
        <div className="my-4 lg:my-[33px] mb-8 lg:mb-[61px] flex w-full h-auto flex-col gap-4 lg:gap-[11.14px]">
          <div className="mx-auto my-3 lg:my-[11px] flex w-full lg:w-[773px] max-w-[600px] flex-col gap-2 lg:gap-[6px] text-center">
            <h1 className="h-auto w-full text-center text-[clamp(1.125rem,0.9rem+1vw,1.5625rem)] font-semibold leading-snug text-[#4D4D4D]">
              Caring is the new marketing
            </h1>
            <p className="mx-auto h-auto w-full justify-center text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-normal leading-relaxed text-[#717171]">
              The Nextcent blog is the best place to read about the latest
              membership insights, trends and more. See who&apos;s joining the
              community, read about how our community are increasing their
              membership income and lot&apos;s more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex w-full h-auto lg:flex-row justify-center gap-10 lg:gap-8 lg:px-[100px]">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="relative mx-auto flex w-full max-w-[256px] lg:w-[256px] h-auto lg:h-[255px] flex-col"
              >
                <img
                  src="/image 18.png"
                  alt=""
                  className="w-full lg:w-[256px] h-auto lg:h-[199px] rounded-[6px]"
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 flex w-[85%] lg:w-[221px] h-auto lg:h-[124px] flex-col gap-[11px] rounded-[6px] bg-[#F5F7FA] p-[11px] shadow-[0px_5.57px_11.14px_0px_#ABBED166]">
                  <p className="h-auto w-full text-center text-[clamp(0.75rem,0.65rem+0.3vw,0.875rem)] font-semibold leading-snug text-[#717171]">
                    Creating Streamlined Safeguarding Processes with OneRen
                  </p>
                  <div className="flex w-full h-auto flex-row items-center justify-center gap-[6px] p-[6px]">
                    <span className="h-auto w-auto align-middle text-sm font-semibold leading-[19px] text-[#4CAF4F]">
                      read more
                    </span>
                    <img src="/dr.png" alt="" className="h-[17px] w-4 text-[#4CAF4F]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full mt-10 lg:mt-16 flex flex-col">
        {/* CTA — FULL WIDTH BACKGROUND */}
        <div className="w-full bg-[#F5F7FA] px-4 py-10 lg:py-4 lg:pt-[22px] lg:pb-[22px]">
          <div className="mx-auto flex w-full max-w-[1140px] flex-col items-center gap-4 lg:gap-[22px]">
            <h1 className="mx-auto h-auto w-full max-w-[617px] text-center text-[clamp(1.5rem,1rem+2.5vw,2.8125rem)] font-semibold leading-[1.2] text-[#263238]">
              Pellentesque suscipit fringilla libero eu.
            </h1>
            <div className="mx-auto w-fit h-9 gap-[6px] rounded-[3px] bg-[#4CAF4F] px-[22px] py-[10px]">
              <p className="h-auto w-auto text-center align-middle text-xs font-medium leading-[17px] text-white">
                Get a Demo
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER — DARK BACKGROUND */}
        <div className="w-full bg-[#263238] px-4 sm:px-10 lg:px-[115px] py-10 lg:py-[64px]">
          <div className="mx-auto flex w-full max-w-[1140px] flex-col lg:flex-row justify-between gap-10 lg:gap-[125px]">

            {/* LEFT SIDE — Logo + Copyright + Social Icons */}
            <div className="flex w-full lg:w-[244px] h-auto flex-col gap-6 lg:gap-[40px]">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <img src="/Icon.jpg" alt="Logo" className="w-8 h-8 rounded" />
                <span className="text-white text-[20px] lg:text-[22px] font-semibold">Nexcent</span>
              </div>

              {/* Copyright */}
              <div className="flex flex-col gap-1">
                <p className="text-[#F5F7FA] text-[12px] lg:text-[14px] font-normal leading-[20px]">
                  Copyright © 2020 Nexcent ltd.
                </p>
                <p className="text-[#F5F7FA] text-[12px] lg:text-[14px] font-normal leading-[20px]">
                  All rights reserved
                </p>
              </div>

              {/* Social Icons — react-icons */}
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B464C] hover:bg-[#4CAF4F] transition-colors"
                >
                  <FaInstagram className="w-4 h-4 text-white" />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B464C] hover:bg-[#4CAF4F] transition-colors"
                >
                  <FaFacebookF className="w-4 h-4 text-white" />
                </a>
                <a
                  href="#"
                  aria-label="Twitter"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B464C] hover:bg-[#4CAF4F] transition-colors"
                >
                  <FaTwitter className="w-4 h-4 text-white" />
                </a>
                <a
                  href="#"
                  aria-label="YouTube"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B464C] hover:bg-[#4CAF4F] transition-colors"
                >
                  <FaYoutube className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>

            {/* RIGHT SIDE — 3 Columns */}
            <div className="flex w-full lg:w-[635px] h-auto flex-col sm:flex-row gap-10 sm:gap-8 lg:gap-[30px]">

              {/* Company Column */}
              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-[24px]">
                <h3 className="text-white text-[16px] lg:text-[20px] font-semibold leading-[28px]">
                  Company
                </h3>
                <ul className="flex flex-col gap-3 lg:gap-[12px]">
                  {["About us", "Blog", "Contact us", "Pricing", "Testimonials"].map((item) => (
                    <li
                      key={item}
                      className="text-[#F5F7FA] text-[12px] lg:text-[14px] font-normal leading-[20px] cursor-pointer hover:text-white transition-colors"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Column */}
              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-[24px]">
                <h3 className="text-white text-[16px] lg:text-[20px] font-semibold leading-[28px]">
                  Support
                </h3>
                <ul className="flex flex-col gap-3 lg:gap-[12px]">
                  {["Help center", "Terms of service", "Legal", "Privacy policy", "Status"].map((item) => (
                    <li
                      key={item}
                      className="text-[#F5F7FA] text-[12px] lg:text-[14px] font-normal leading-[20px] cursor-pointer hover:text-white transition-colors"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stay up to date Column */}
              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-[24px]">
                <h3 className="text-white text-[16px] lg:text-[20px] font-semibold leading-[28px]">
                  Stay up to date
                </h3>
                <div className="flex items-center w-full max-w-[255px] h-[40px] rounded-[8px] bg-[#515B60] pl-4 pr-1">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 min-w-0 h-full border-none bg-transparent text-[12px] lg:text-[14px] text-white placeholder-[#D9DBE1] focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Subscribe"
                    className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-transparent hover:bg-[#4CAF4F] transition-colors flex-shrink-0"
                  >
                    <img src="/dr.png" alt="" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}