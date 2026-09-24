"use client";

import { useState } from "react";
import { FaInstagram, FaFacebookF, FaTwitter, FaYoutube } from "react-icons/fa";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* NAVBAR */}
      <div className="w-full bg-white">
        <nav className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 md:px-8 lg:px-[5%] text-[#263238]">
          <div className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <img src="/Icon.jpg" alt="Logo" className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
            <span className="text-sm sm:text-base md:text-lg font-semibold whitespace-nowrap">Nextcent</span>
          </div>

          {/* Row nav from sm upward */}
          <div className="hidden flex-1 items-center justify-end gap-2 sm:flex sm:gap-3 lg:gap-6">
            <ul className="flex list-none gap-2 sm:gap-3 lg:gap-9">
              <li>
                <a href="#" className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#263238] no-underline hover:text-[#4CAF4F] transition-colors whitespace-nowrap">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#263238] no-underline hover:text-[#4CAF4F] transition-colors whitespace-nowrap">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#263238] no-underline hover:text-[#4CAF4F] transition-colors whitespace-nowrap">
                  Community
                </a>
              </li>
              <li>
                <a href="#" className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#263238] no-underline hover:text-[#4CAF4F] transition-colors whitespace-nowrap">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#263238] no-underline hover:text-[#4CAF4F] transition-colors whitespace-nowrap">
                  Pricing
                </a>
              </li>
            </ul>
            <a href="#" className="text-[10px] sm:text-xs lg:text-sm font-medium no-underline text-[#4CAF4F] hover:text-green-700 transition duration-300 whitespace-nowrap">
              login
            </a>
            <button className="inline-flex flex-row flex-nowrap items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded bg-[#4CAF50] px-2.5 py-1.5 sm:px-3 md:px-4 lg:px-5 text-[10px] sm:text-xs lg:text-sm text-white transition duration-300 hover:bg-[#388E3C]">
              <span className="whitespace-nowrap">sign up</span>
              <img src="/dr.png" alt="" className="w-[12px] sm:w-[15px] h-[12px] sm:h-[15px] flex-shrink-0" />
            </button>
          </div>

          {/* Mobile hamburger — true mobile only, below sm */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex flex-col justify-center items-center gap-[5px] sm:hidden"
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

        {/* Mobile menu panel — true mobile only, below sm */}
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 sm:hidden">
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
              <li>
                <a href="#" className="text-sm font-medium text-[#4CAF4F] hover:text-green-700 transition duration-300 whitespace-nowrap no-underline">
                  login
                </a>
              </li>
            </ul>
            <button className="inline-flex w-fit flex-row flex-nowrap items-center gap-1.5 whitespace-nowrap rounded bg-[#4CAF50] px-5 py-2 text-sm text-white transition duration-300 hover:bg-[#388E3C]">
              <span className="whitespace-nowrap">Register</span>
              <img src="/dr.png" alt="" className="w-[15px] h-[15px] flex-shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* HERO — FULL WIDTH BACKGROUND */}
      <div className="w-full bg-[#F5F7FA] mb-6 sm:mb-7">
        <div className="mx-auto flex w-full max-w-[1140px] min-h-fit lg:min-h-[450px] flex-col-reverse sm:flex-row items-center justify-around gap-8 sm:gap-10 lg:gap-[72px] px-4 sm:px-8 md:px-12 lg:px-[100px] py-8 sm:py-10 lg:py-[67px]">
          <div className="flex w-full sm:w-1/2 lg:w-[490px] flex-col items-center sm:items-start gap-4 sm:gap-5 lg:gap-[22px] text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[46px] font-semibold leading-[1.15] text-[#4D4D4D]">
              Lessons and insights
            </h1>
            <span className="text-2xl sm:text-3xl md:text-4xllg:text-[46px] font-semibold leading-[1.15] text-[#4CAF4F]">
              From 8 years
            </span>
            <p className="text-sm sm:text-base font-normal leading-relaxed text-[#717171] max-w-[420px]">
              Where to grow your business as a photographer: site or social media?
            </p>
            <button className="w-fit px-6 py-3 lg:w-[128px] lg:h-[52px] rounded-[3px] bg-[#4CAF50] lg:pt-[10px] lg:pr-10 lg:pb-[10px] lg:pl-[22px] text-white text-sm lg:text-base transition duration-300 hover:bg-[#388E3C]">
              Register
            </button>
          </div>
          <div className="w-full sm:w-auto flex justify-center">
            <img
              src="/Illustration-removebg-preview.png"
              alt=""
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[220px] md:h-[220px] lg:w-[282px] lg:h-[283px]"
            />
          </div>
        </div>
      </div>

     {/* CLIENTS */}
<div className="mx-auto my-6 sm:my-[30px] w-full max-w-[1140px] h-auto px-4 sm:px-8 md:px-12 lg:px-[100px]">
  <div className="mx-auto flex w-full max-w-[773px] flex-col gap-2">
    <h2 className="text-center text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4D4D4D]">
      Our Clients
    </h2>
    <p className="text-center text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
      We have been working with some Fortune 500+ clients
    </p>
  </div>

  {/* Mobile slider - below 375px (swipe left-right) */}
  <div className="block min-[375px]:hidden mt-6 overflow-hidden">
    <div className="flex overflow-x-auto scroll-smooth gap-8 pl-6 pr-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <div key={n} className="flex-shrink-0">
          <img
            src={`/Logo__${n}_-removebg-preview.png`}
            alt=""
            className="w-7 h-7 rounded-md"
          />
        </div>
      ))}
    </div>
  </div>

  {/* Row on screens 375px and up */}
  <div className="hidden min-[375px]:flex mt-6 flex-row flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between sm:gap-4">
    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
      <div key={n} className="flex-shrink-0">
        <img
          src={`/Logo__${n}_-removebg-preview.png`}
          alt=""
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-md"
        />
      </div>
    ))}
  </div>
</div>

      {/* COMMUNITY / WHO IT'S FOR */}
      <div className="mx-auto flex w-full max-w-[1140px] mt-9 h-auto flex-col gap-6 sm:gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="w-full h-auto">
          <h2 className="mx-auto h-auto w-full max-w-[377px] text-center text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4D4D4D]">
            Manage your entire community in a single system
          </h2>
          <p className="mt-2 h-auto w-full text-center text-xs sm:text-sm font-normal leading-relaxed text-[#263238]">
            Who is Nextcent suitable for?
          </p>
        </div>

        <div className="flex w-full h-auto flex-col sm:flex-row justify-between gap-6 lg:px-[100px]">
          <div className="w-[85%] mx-auto sm:mx-0 sm:w-1/3 lg:w-[299px] shadow-[0px_2px_4px_0px_#ABBED133] hover:shadow-[0px_4px_10px_0px_#ABBED180] transition-shadow duration-300 flex h-auto flex-col items-center gap-2 rounded-md bg-white py-5 px-5">
            <div className="flex w-full  max-w-[186px] h-auto flex-col items-center gap-3">
              <div className="w-10 h-9 sm:w-11 sm:h-10">
                <img src="/Icon.png" alt="" className="w-full h-full object-contain" />
              </div>
              <h3 className="h-auto w-full text-center text-base sm:text-lg font-bold leading-snug text-[#4D4D4D]">
                Membership Organisations
              </h3>
            </div>
            <p className="w-full h-auto text-center max-w-[290px] text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
              Our membership management software provides full automation of
              membership renewals and payments
            </p>
          </div>

          <div className="w-[85%] mx-auto sm:mx-0 sm:w-1/3 lg:w-[299px] shadow-[0px_2px_4px_0px_#ABBED133] hover:shadow-[0px_4px_10px_0px_#ABBED180] transition-shadow duration-300 flex h-auto flex-col items-center gap-2 rounded-md bg-white py-5 px-5">
            <div className="flex w-full max-w-[185px] h-auto flex-col items-center gap-3 ">
              <div className="w-10 h-9 sm:w-11 sm:h-10">
                <img src="/Icon.png" alt="" className="w-full h-full object-contain" />
              </div>
              <h3 className="h-auto w-full text-center text-base sm:text-lg font-bold leading-snug text-[#4D4D4D]">
                National Associations
              </h3>
            </div>
            <p className="w-full h-auto text-center max-w-[290px] text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
              Our membership management software provides full automation of
              membership renewals and payments
            </p>
          </div>

          <div className="w-[85%] mx-auto sm:mx-0 sm:w-1/3 lg:w-[299px] shadow-[0px_2px_4px_0px_#ABBED133] hover:shadow-[0px_4px_10px_0px_#ABBED180] transition-shadow duration-300 flex h-auto flex-col items-center gap-2 rounded-md bg-white py-5 px-5">
            <div className="flex w-full max-w-[186px] h-auto flex-col items-center gap-3">
              <div className="w-10 h-9 sm:w-11 sm:h-10">
                <img src="/Icon.png" alt="" className="w-full h-full object-contain" />
              </div>
              <h3 className="h-auto w-full text-center text-base sm:text-lg font-bold leading-snug text-[#4D4D4D]">
                Clubs And <br /> Groups
              </h3>
            </div>
            <p className="w-full h-auto text-center max-w-[290px] text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
              Our membership management software provides full automation of
              membership renewals and payments
            </p>
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 1 */}
      <div className="mx-auto mt-6 lg:mt-[26px] w-full max-w-[1140px] h-auto flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="w-full h-auto">
          <div className="flex w-full h-auto flex-col sm:flex-row items-center gap-8 lg:gap-16 justify-center lg:px-[100px]">
            <div className="w-full max-w-[308px] sm:w-[35%] lg:w-[308px] h-auto flex-shrink-0">
              <img src="/craiyon_111152_image.png" alt="" className="w-full h-auto" />
            </div>
            <div className="flex w-full h-auto flex-col items-center sm:items-start gap-4 lg:gap-[22px] px-4 sm:px-0">
              <div className="flex w-full h-auto flex-col gap-3 text-center sm:text-left">
                <h2 className="h-auto text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4D4D4D]">
                  The unseen of spending three years at Pixelgrade
                </h2>
                <p className="h-auto text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit
                  amet justo ipsum. Sed accumsan quam vitae est varius fringilla.
                  Pellentesque placerat vestibulum lorem sed porta. Nullam mattis
                  tristique iaculis. Nullam pulvinar sit amet risus pretium
                  auctor. Etiam quis massa pulvinar, aliquam quam vitae, tempus
                  sem. Donec elementum pulvinar odio.
                </p>
              </div>
              <button className="w-fit rounded-[3px] bg-[#4CAF4F] px-6 py-2 text-white text-sm hover:bg-[#388E3C] transition-colors">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS — FULL WIDTH BACKGROUND */}
      <div className="w-full bg-[#F5F7FA] my-6 lg:my-[33px]">
        <div className="mx-auto flex w-full max-w-[1140px] h-auto flex-col sm:flex-row justify-between gap-8 lg:gap-16 py-8 lg:pt-[45px] lg:pb-[46px] px-4 sm:px-8 md:px-12 lg:px-[100px]">
          <div className="w-full sm:w-[42%] lg:w-[375px] h-auto flex-shrink-0">
            <div className="flex w-full h-auto flex-col gap-2 text-center sm:text-left items-center sm:items-start">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4D4D4D]">
                Helping a local
              </h2>
              <span className="text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4CAF4F]">
                business reinvent itself
              </span>
              <p className="mt-2 h-auto text-xs sm:text-sm font-normal leading-relaxed text-[#18191F]">
                We reached here with our hard work and dedication
              </p>
            </div>
          </div>

          {/* Row on mobile, wraps into two even columns from sm up */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full sm:w-[55%] lg:w-[376px]">
            {[
              { icon: "/Icon (3).png", value: "2,245,341", label: "Members" },
              { icon: "/Icon (4).png", value: "46,328", label: "Clubs" },
              { icon: "/Icon (5).png", value: "828,867", label: "Event Bookings" },
              { icon: "/Vector.png", value: "1,926,436", label: "Payments" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-row items-center gap-3 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                  <img src={stat.icon} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold leading-snug text-[#4D4D4D]">
                    {stat.value}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-normal leading-relaxed text-[#717171]">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 2 */}
      <div className="mx-auto w-full max-w-[1140px] h-auto flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="w-full h-auto">
          <div className="flex w-full h-auto flex-col-reverse sm:flex-row items-center gap-8 lg:gap-16 justify-center lg:px-[100px]">
            <div className="w-[55%] sm:w-[35%] lg:w-auto h-auto flex-shrink-0 mx-auto sm:mx-0 self-center mb-2 sm:mb-0">
              <img src="/pana-removebg-preview.png" alt="" className="w-full h-auto lg:h-[302px] lg:w-auto" />
            </div>
            <div className="flex w-full h-auto flex-col items-center sm:items-start gap-4 lg:gap-[22px] px-4 sm:px-0">
              <div className="w-full h-auto flex flex-col gap-2 text-center sm:text-left">
                <h2 className="h-auto text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4D4D4D]">
                  How to design your site footer like we did.
                </h2>
                <p className="h-auto text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
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
              <button className="w-fit rounded-[3px] bg-[#4CAF4F] px-6 py-2 text-white text-sm hover:bg-[#388E3C] transition-colors">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMERS / TESTIMONIAL — FULL WIDTH BACKGROUND */}
      <div className="w-full bg-[#F5F7FA] my-6 lg:my-[34px]">
        <div className="mx-auto flex w-full max-w-[1140px] h-auto flex-col-reverse sm:flex-row justify-center items-center gap-8 lg:gap-[54px] py-8 lg:pt-[22px] lg:pb-[22px] px-4 sm:px-8 md:px-12 lg:px-[100px]">
          <div className="mx-auto sm:mx-0 flex-shrink-0">
            <img
              src="/image 9.png"
              alt=""
              className="w-[260px] h-[180px] sm:w-[226px] sm:h-[290px] rounded-md shadow-[0px_5.57px_11.14px_0px_#ABBED166]"
            />
          </div>
          <div className="flex w-full lg:w-[721px] h-auto flex-col items-center sm:items-start gap-4 lg:gap-[22px] px-4 sm:px-0">
            <div className="flex w-full h-auto flex-col gap-3 text-center sm:text-left">
              <p className="h-auto w-full text-xs sm:text-sm font-medium leading-relaxed text-[#717171]">
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
              <div className="flex flex-col gap-1">
                <h3 className="h-auto w-full text-sm font-semibold leading-[19px] text-[#4CAF4F]">
                  Tim Smith
                </h3>
                <p className="h-auto w-full text-xs font-normal leading-[17px] text-[#89939E]">
                  British Dragon Boat Racing Association
                </p>
              </div>
            </div>

            {/* Row on mobile, spreads into even columns from sm up */}
            <div className="flex w-full flex-col sm:flex-row items-center gap-4 lg:gap-[22px]">
              <div className="flex w-full max-w-[343px] flex-row flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex-shrink-0">
                    <img src={`/Logo__${n}_-removebg-preview.png`} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
              <div className="w-fit h-auto flex items-center gap-1.5">
                <p className="h-auto w-auto text-sm font-semibold leading-[19px] text-[#4CAF4F]">
                  Meet all customers
                </p>
                <img src="/dr.png" alt="" className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 3 */}
      <div className="mx-auto w-full max-w-[1140px] h-auto flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        {/* BLOG / UPDATES */}
        <div className="my-6 lg:my-[33px] mb-10 lg:mb-[61px] flex w-full h-auto flex-col gap-6">
          <div className="mx-auto my-3 flex w-full max-w-[600px] flex-col gap-2 text-center">
            <h2 className="h-auto w-full text-center text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-[#4D4D4D]">
              Caring is the new marketing
            </h2>
            <p className="mx-auto h-auto w-full max-w-[437px] sm:max-w-[637px] text-xs sm:text-sm font-normal leading-relaxed text-[#717171]">
              The Nextcent blog is the best place to read about the latest
              membership insights, trends and more. See who&apos;s joining the
              community, read about how our community are increasing their
              membership income and lot&apos;s more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto justify-items-center gap-10 sm:gap-4 lg:gap-8 lg:px-[100px]">
  {[
    {
      img: "/image 18.png",
      text: "Creating Streamlined Safeguarding Processes with OneRen",
    },
    {
      img: "/image 18.png",
      text: "What are your safeguarding responsibilities and how can you manage them?",
    },
    {
      img: "/image 18.png",
      text: "Revamping the Membership Model with Triathlon Australia",
    },
  ].map((card, index) => (
    <div
      key={index}
      className="relative flex w-full max-w-[316px] h-auto flex-col"
    >
      <img
        src={card.img}
        alt=""
        className="w-full h-auto sm:h-[199px] rounded-md"
      />
      <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-10 flex w-[85%] max-w-[221px] h-auto flex-col gap-3 rounded-md bg-[#F5F7FA] p-3 shadow-[0px_5.57px_11.14px_0px_#ABBED166]">
        <p className="h-auto w-full text-center text-xs sm:text-sm font-semibold leading-snug text-[#717171]">
          {card.text}
        </p>
        <div className="flex w-full h-auto flex-row items-center justify-center gap-1.5">
          <span className="h-auto w-auto text-sm leading-[19px] text-[#4CAF4F]">
            Read more
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
            <h2 className="mx-auto h-auto w-full max-w-[617px] text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-[1.2] text-[#263238]">
              Pellentesque suscipit fringilla libero eu.
            </h2>
            <button className="mx-auto w-fit rounded-[3px] bg-[#4CAF4F] px-6 py-2 text-xs font-medium leading-[17px] text-white hover:bg-[#388E3C] transition-colors">
              Get a Demo
            </button>
          </div>
        </div>

        {/* FOOTER — DARK BACKGROUND */}
        <div className="w-full bg-[#263238] px-4 sm:px-8 md:px-12 lg:px-[115px] py-10 lg:py-[64px]">
          <div className="mx-auto flex w-full max-w-[1140px] flex-col lg:flex-row justify-between gap-10 lg:gap-[125px]">

            {/* LEFT SIDE — Logo + Copyright + Social Icons */}
            <div className="flex w-full lg:w-[244px] h-auto flex-col gap-6 lg:gap-10">
              <div className="flex items-center gap-2">
                <img src="/Icon.jpg" alt="Logo" className="w-8 h-8 rounded" />
                <span className="text-white text-lg sm:text-xl font-semibold">Nexcent</span>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[#F5F7FA] text-xs sm:text-sm font-normal leading-[20px]">
                  Copyright © 2020 Nexcent ltd.
                </p>
                <p className="text-[#F5F7FA] text-xs sm:text-sm font-normal leading-[20px]">
                  All rights reserved
                </p>
              </div>

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

              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-6">
                <h3 className="text-white text-base sm:text-lg lg:text-xl font-semibold leading-[28px]">
                  Company
                </h3>
                <ul className="flex flex-col gap-3">
                  {["About us", "Blog", "Contact us", "Pricing", "Testimonials"].map((item) => (
                    <li
                      key={item}
                      className="text-[#F5F7FA] text-xs sm:text-sm font-normal leading-[20px] cursor-pointer hover:text-white transition-colors"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-6">
                <h3 className="text-white text-base sm:text-lg lg:text-xl font-semibold leading-[28px]">
                  Support
                </h3>
                <ul className="flex flex-col gap-3">
                  {["Help center", "Terms of service", "Legal", "Privacy policy", "Status"].map((item) => (
                    <li
                      key={item}
                      className="text-[#F5F7FA] text-xs sm:text-sm font-normal leading-[20px] cursor-pointer hover:text-white transition-colors"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-6">
                <h3 className="text-white text-base sm:text-lg lg:text-xl font-semibold leading-[28px]">
                  Stay up to date
                </h3>
                <div className="flex items-center w-full max-w-[255px] h-10 rounded-lg bg-[#515B60] pl-4 pr-1">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 min-w-0 h-full border-none bg-transparent text-xs sm:text-sm text-white placeholder-[#D9DBE1] focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Subscribe"
                    className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent hover:bg-[#4CAF4F] transition-colors flex-shrink-0"
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