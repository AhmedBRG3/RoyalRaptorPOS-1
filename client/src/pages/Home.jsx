import React, { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollTrigger, TextPlugin, ScrollToPlugin);

export default function Home() {
  const container = useRef(null);
  const videoRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    video.preload = "auto";
    video.muted = true;
    gsap.set(
      [
        ".text1-body",
        ".text2-head",
        ".text2-body",
        ".text3-head",
        ".text3-body",
      ],
      { opacity: 0, y: 50 }
    );

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".wrapper",
        start: "top top",
        end: "+=1000", // adjust total scroll length
        scrub: 2,
        pin: true,
        onUpdate: (self) => {
          const progress = self.progress; // 0 to 1
          video.currentTime = progress * video.duration;
        },
      },
    });

    video.addEventListener("loadedmetadata", () => {
      // Section 2 animation

      tl.fromTo(".section3", { yPercent: 100 }, { yPercent: 0, duration: 1 });

      // Transition to Section 4
    });

    const tl2 = gsap.timeline({
      scrollTrigger: {
        trigger: ".section4",
        start: "top top",
        end: "+=2000",
        scrub: 2,
        pin: true,
        markers: false,
        anticipatePin: 1,
      },
    });

    // Text 1 Animation

    tl2
      .to(
        ".text1-body",
        {
          duration: 1,
          opacity: 1,
          y: 0,
        },
        "+=0.5"
      )
      .to(
        [".text1-head", ".text1-body"],
        { opacity: 0, duration: 0.5, y: -50 },
        "+=1"
      );

    // Text 2 Animation
    tl2
      .to(".text2-head", { duration: 1, opacity: 1, y: 0 })
      .to(".text2-body", { duration: 1, opacity: 1, y: 0 }, "-=0.5")
      .to(
        [".text2-head", ".text2-body"],
        { opacity: 0, duration: 0.5, y: -50 },
        "+=1"
      );

    // Text 3 Animation
    tl2
      .to(".text3-head", { duration: 1, opacity: 1, y: 0 })
      .to(".text3-body", { duration: 1, opacity: 1, y: 0 }, "-=0.5")
      .to(
        [".text3-head", ".text3-body"],
        { opacity: 0, duration: 0.5, y: -50 },
        "+=1"
      );
    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  // Computes an offset equal to the nav height (prevents content hiding under a fixed navbar)
  const getOffsetY = () => (navRef.current?.offsetHeight ?? 0) + 8; // +8 for a little breathing room

  const scrollToSection = useCallback((selector) => {
    gsap.to(window, {
      duration: 1,
      ease: "power2.inOut",
      scrollTo: { y: selector, offsetY: getOffsetY() },
    });
  }, []);

  return (
    <main ref={container} className="w-full home relative kkfont normal">
      {/* Section 1 - No animations */}
      <section className="section1 w-screen h-screen bg-white z-0 overflow-hidden">
        <div ref={navRef} className="navbar flex">
          <ul className="flex justify-between list-disc w-screen text-lg items-center w-500 p-4">
            <img src="logo.png" className="w-16" alt="" />
            <li onClick={() => scrollToSection("#home")}>Home</li>
            <li onClick={() => scrollToSection("#services")}>Services</li>
            <li onClick={() => scrollToSection("#values")}>Values</li>
            <li onClick={() => scrollToSection("#contact")}>Contact Us</li>
          </ul>
        </div>
        <div className="text kkfont normal w-700 text-left absolute mt-24 ml-4 text-3xl w-52">
          <p>Looking to grow your business?</p>
          <p className="text-[#1D7CB9] mt-2">We Got you covered!</p>
        </div>
        <div className="burj  top-[6rem] -right-10 z-[1]">
          <img className="h-auto w-[50rem]" src="burj.png" alt="Burj" />
        </div>
      </section>

      <div id="home" className="wrapper relative h-screen w-screen ">
        <div className="section2 absolute w-screen h-screen bg-[#1D7CB9]">
          <div className="flex flex-col items-center justify-center h-full text-white px-8">
            <h1 className="text-4xl font-bold mb-8 text-center">
              Powering Growth Across MENA
            </h1>
            <p className="text-lg mb-8 text-center max-w-4xl">
              We own and operate across Egypt, Saudi Arabia, and the UAE, with 6
              successful companies thriving in diverse sectors. This wide
              presence and hands-on experience across industries grant us
              unmatched market intelligence, operational agility, and a deep
              understanding of each sector's challenges and opportunities. That
              means we don't just offer services — we deliver proven, localized,
              and strategic solutions that give your business a real head start.
            </p>
            <button className="bg-white text-[#1D7CB9] px-6 py-3 rounded-lg text-lg">
              Free Consultation
            </button>
          </div>
        </div>

        {/* Section 3 - Now appears on top with video, starts with opacity 0 */}
        <div className="section3 absolute w-screen h-screen z-40">
          <video
            ref={videoRef}
            src="sky.mp4"
            className="w-full h-full object-cover"
            playsInline
            muted
            preload="auto"
          />

          <div className="absolute w-screen top-0 mt-12 text-2xl">
            <p className="mr-12 mb-1">We Go Above</p>
            <p className="ml-12">And Beyond</p>
          </div>

          {/* Three black boxes on top of video */}
          <div className="inset-0 absolute flex flex-col mt-[15rem] w-screen ">
            <div className="contauner bg-black text-white flex-flex-col justify-center py-10 underline uppercase text z-50">
              {/* Box 1 */}
              <div className="box1 bg-black flex items-center justify-center">
                <p
                  onClick={() => (window.location.href = "/setup")}
                  className="text-white text-xl font-medium text-center px-4 left-0"
                >
                  Business Setup
                </p>
              </div>

              {/* Box 2 */}
              <div className="box2 bg-black flex items-center justify-center mt-12 z-50 ">
                <p
                  onClick={() => (window.location.href = "/solutions")}
                  className="text-white text-xl font-medium text-center px-4 left-0"
                >
                  Business Solutions
                </p>
              </div>
              {/* Box 3 */}
              <div className="box3 bg-black flex items-center justify-center mt-12 z-50 ">
                <p
                  onClick={() => (window.location.href = "/marketing")}
                  className="text-white text-xl font-medium text-center px-4 left-0"
                >
                  Marketing & Advertising
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 - Expands from small box */}
      <section
        id="services"
        className="section4 mt-24 w-screen h-screen z-50 bg-white px-12"
      >
        <div className="flex flex-col items-center justify-center h-full px-12">
          <div className="mb-8 absolute">
            <h1 className="text1-head text-3xl font-bold mb-4 text-center">
              Looking To Grow Your Business Into New Regions?
            </h1>
            <p className="text1-body text-lg text-center">
              Taking your company into Egypt, the UAE, or Saudi Arabia can be
              complex, but we simplify the process. Our team handles legal
              approvals, financial setup, licensing, and market entry strategies
              so you can expand smoothly and efficiently. We also assist with
              UAE or Saudi residency visas, helping you establish a long-term
              presence for sustained growth
            </p>
          </div>

          <div className="mb-8 absolute">
            <h1 className="text2-head text-3xl font-bold mb-4 text-center">
              Ready To Launch A Startup In The Middle East?
            </h1>
            <p className="text2-body text-lg text-center">
              We provide end-to-end support for entrepreneurs and startups, from
              choosing the right jurisdiction to business structuring, branding,
              and go-to-market strategies. With extensive regional insights, we
              help ensure your startup gets off the ground successfully.
            </p>
          </div>

          <div className="mb-8 absolute">
            <h1 className="text3-head text-3xl font-bold mb-4 text-center">
              Struggling With The Practicalities Of Market Entry?
            </h1>
            <p className="text3-body text-lg text-center">
              Our specialists guide you through complex compliance frameworks
              and entry protocols. We assist in documentation, translation,
              legal guidance, and official interactions so your entry into MENA
              markets is smooth and secure.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 - Normal scroll */}
      <section
        id="values"
        className="section5  w-screen h-screen z-60 bg-black"
      >
        <div className="flex flex-col items-center justify-center h-full text-white px-8">
          <div className="max-w-4xl space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-4 text-center">Mission</h1>
              <p className="text-lg text-center">
                At BinRashid Group Egypt, our mission is to empower businesses
                to thrive in a dynamic and competitive landscape by delivering
                comprehensive, innovative, and tailored business solutions. We
                are committed to providing exceptional services across finance,
                accounting, auditing, legal consultation, sales, and business
                development, ensuring our clients achieve sustainable growth and
                operational excellence.
              </p>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-4 text-center">Vision</h1>
              <p className="text-lg text-center">
                To transform the way businesses operate by delivering
                integrated, innovative solutions that unlock potential and drive
                sustainable growth. We aspire to be the driving force behind our
                clients' success, setting new standards of excellence and
                professionalism.
              </p>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-4 text-center">Values</h1>
              <p className="text-lg text-center">
                Thought Partnership, Leadership, Be the Solution, Deliver with
                Excellence, Learn and Teach, Diversity
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="section6  w-screen h-screen bg-white">
        <div className="w-full h-full flex flex-col items-center justify-center">
          <h2 className="text-4xl font-bold mb-8">Get in Touch</h2>
          <p className="text-lg mb-4 text-center w-96">
            Ready to take your business to the next level? Contact us today to
            learn more about our services and how we can help you succeed.
          </p>
          <button className="bg-[#1D7CB9] text-white px-6 py-3 rounded-lg text-lg">
            Contact Us
          </button>
        </div>
      </section>
    </main>
  );
}
