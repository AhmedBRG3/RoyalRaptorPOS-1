import React, { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollTrigger, TextPlugin, ScrollToPlugin);

export default function BusSetup() {
  const container = useRef(null);
  const videoRef = useRef(null);
  const servicesVideoRef = useRef(null);
  const thirdSectionRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const servicesVideo = servicesVideoRef.current;
    const thirdSection = thirdSectionRef.current;
    if (!video || !servicesVideo || !thirdSection) return;

    // Setup both videos
    [video, servicesVideo].forEach(v => {
      v.preload = "auto";
      v.muted = true;
      v.pause();
      v.currentTime = 0;
    });

    // Set initial states
    gsap.set(video, { opacity: 1 });
    gsap.set(servicesVideo, { opacity: 0 });
    gsap.set(thirdSection, { yPercent: 100 });

    const createTimelines = () => {
      if (isNaN(video.duration) || video.duration === 0 || 
          isNaN(servicesVideo.duration) || servicesVideo.duration === 0) return;

      // Combined timeline for both video sections
      const mainTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".video-sections-container",
          start: "top top",
          end: "+=6000",
          scrub: true,
          pin: true,
          anticipatePin: 1,
        },
      });

      // Initial states
      mainTl.set([".market-head", ".market-body"], { opacity: 0, y: 50 });
      mainTl.set([".services-head", ".services-body"], { opacity: 0, y: 50 });
      mainTl.set(video, { currentTime: 0, opacity: 1 });
      mainTl.set(servicesVideo, { currentTime: 0, opacity: 0 });

      // FIRST VIDEO SECTION (0-50% of scroll)
      // Phase 1: Market text fade in (0-12.5%)
      mainTl.to(".market-head", { opacity: 1, y: 0, duration: 0.125 });
      mainTl.to(".market-body", { opacity: 1, y: 0, duration: 0.125 }, "+=0.0625");

      // Phase 2: Market text fade out (12.5-25%)
      mainTl.to(".market-body", { opacity: 0, y: -50, duration: 0.125 }, "+=0.0625");
      mainTl.to(".market-head", { opacity: 0, y: -50, duration: 0.125 }, "+=0.0625");

      // Phase 3: Video2 scrubbing (25-37.5%)
      mainTl.to(
        video,
        {
          currentTime: video.duration,
          ease: "none",
          duration: 0.5,
        },
        "-=0.0625"
      );

      // Phase 4: Video transition (37.5-50%)
      mainTl.to(video, { opacity: 0, duration: 0.0625 }, "-=0.125");
      mainTl.to(servicesVideo, { opacity: 1, duration: 0.0625 }, "<");

      // SECOND VIDEO SECTION (50-100% of scroll)
      // Phase 5: Services text fade in (50-62.5%)
      mainTl.to(".services-head", { opacity: 1, y: 0, duration: 0.125 });
      mainTl.to(".services-body", { opacity: 1, y: 0, duration: 0.125 }, "+=0.0625");

      // Phase 6: Services text fade out (62.5-75%)
      mainTl.to(".services-body", { opacity: 0, y: -50, duration: 0.125 }, "+=0.0625");
      mainTl.to(".services-head", { opacity: 0, y: -50, duration: 0.125 }, "+=0.0625");

      // Phase 7: Video3 scrubbing (75-100%)
      mainTl.to(
        servicesVideo,
        {
          currentTime: servicesVideo.duration,
          ease: "none",
          duration: 0.5,
        },
        "-=0.0625"
      );

      // Third section timeline - slides up over the video sections
      const tl3 = gsap.timeline({
        scrollTrigger: {
          trigger: ".values-wrapper",
          start: "top bottom",
          end: "top top",
          scrub: true,
          anticipatePin: 1,
        },
      });

      // Slide up animation
      tl3.to(thirdSection, {
        yPercent: 0,
        ease: "none",
        duration: 1,
      });
    };

    // Add a small delay to ensure DOM elements are ready
    const timer = setTimeout(() => {
      if (video.readyState >= 1 && servicesVideo.readyState >= 1) {
        createTimelines();
      } else {
        const checkBothVideos = () => {
          if (video.readyState >= 1 && servicesVideo.readyState >= 1) {
            createTimelines();
          }
        };
        
        video.addEventListener("loadedmetadata", checkBothVideos);
        servicesVideo.addEventListener("loadedmetadata", checkBothVideos);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      video.removeEventListener("loadedmetadata", createTimelines);
      servicesVideo.removeEventListener("loadedmetadata", createTimelines);
    };
  }, []);

  const scrollToSection = useCallback((selector) => {
    gsap.to(window, { duration: 2, scrollTo: selector });
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
        <div className="text kkfont bg-white p-5 normal z-50 text-left absolute mt-24 w-screen text-3xl">
          <p>Business Setup In Emirates </p>
          <p className="text-[#1D7CB9] mt-2">And In Saudi Arabia</p>
        </div>

        <img className="z-10 from-current to-transparent baack" src="map.png" />
      </section>

      {/* Combined Video Sections Container */}
      <div className="video-sections-container relative h-screen w-screen">
        {/* First Video Section - Market Expertise */}
        <div id="home" className="home-wrapper absolute w-screen h-screen z-40">
          <video
            ref={videoRef}
            src="video2.mp4"
            className="w-full h-full object-cover"
            playsInline
            muted
            preload="auto"
          />

          <div className="absolute w-screen text-white top-0 mt-12 text-2xl p-4">
            <h1 className="text-3xl mb-12 market-head">
              Deep Market Expertise in Saudi Arabia & UAE
            </h1>
            <p className="text-[1.2rem] market-body">
              With in-depth knowledge of two of the region's most dynamic
              economies, we guide investors through the thriving markets of
              Saudi Arabia and the UAE. Saudi Arabia, fueled by Vision 2030, is
              driving economic diversification with major investments in
              technology, infrastructure, and tourism, while offering increasing
              opportunities through 100% foreign ownership and streamlined
              regulations. The UAE, a global business hub, provides world-class
              infrastructure, tax incentives, and Free Zones tailored for
              startups and multinational enterprises alike. By understanding
              local business culture, legal frameworks, and market dynamics, we
              provide insights and comparisons that help you choose the right
              setup and thrive in these competitive and fast-evolving markets.
            </p>
          </div>
        </div>

        {/* Second Video Section - Services */}
        <div id="services" className="services-wrapper absolute w-screen h-screen z-40">
          <video
            ref={servicesVideoRef}
            src="video3.mp4"
            className="w-full h-full object-cover"
            playsInline
            muted
            preload="auto"
          />

          <div className="absolute w-screen text-white top-0 mt-12 text-2xl p-4">
            <h1 className="text-3xl mb-12 services-head">
              Comprehensive Business Setup Services
            </h1>
            <p className="text-[1.2rem] services-body">
              From company registration and licensing to banking solutions and legal compliance,
              we provide end-to-end support for your business establishment. Our services include
              trade license acquisition, visa processing, office setup, and ongoing regulatory
              compliance management. Whether you're launching a startup or expanding an existing
              enterprise, we streamline the entire process, ensuring you meet all local
              requirements while minimizing delays and maximizing efficiency in both markets.
            </p>
          </div>
        </div>
      </div>
      {/* Third Section - Values (slides up) */}
      <div id="values" className="values-wrapper relative h-screen w-screen">
        <div 
          ref={thirdSectionRef}
          className="section5 absolute w-screen h-screen z-50 bg-[#1D7CB9]"
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white p-8 max-w-4xl">
              <h1 className="text-5xl mb-8 font-bold values-head">
                Our Core Values
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
                  <h3 className="text-2xl mb-4 font-semibold">Excellence</h3>
                  <p className="text-lg">
                    We deliver exceptional service quality and maintain the highest 
                    standards in everything we do.
                  </p>
                </div>
                <div className="p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
                  <h3 className="text-2xl mb-4 font-semibold">Trust</h3>
                  <p className="text-lg">
                    Building lasting relationships through transparency, 
                    reliability, and honest communication.
                  </p>
                </div>
                <div className="p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
                  <h3 className="text-2xl mb-4 font-semibold">Innovation</h3>
                  <p className="text-lg">
                    Embracing cutting-edge solutions and staying ahead 
                    of market trends for our clients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </main>
  );
}