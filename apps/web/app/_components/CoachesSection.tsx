"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { ScrollAnimation } from "./ScrollAnimation";

interface Coach {
  id: string;
  sport: string;
  name: string;
  description: string;
  quote?: string;
  achievements?: string[];
  imageUrl?: string;
}

const COACHES_DATA: Coach[] = [
  {
    id: '1',
    sport: 'Basketball',
    name: 'Coach Samer Nino',
    description: 'Coach Samer Nino has immense experience in the basketball field and has shown great passion for youth sports. He has several accomplishments as a player; in 1995, he was part of the U18 National Boys Basketball Team, which received the bronze medal at the Asia Cup. He continued his basketball career earning four national titles, as well as several championships. He served as Head Coach for several clubs, and in 2014, he was assistant Coach for the U18 National Team for the Asia games in Qatar. He later was assistant coach and manager for the Men\'s National Team. Coach Samer was head coach for several years for different age groups at the Orthodox Club. where he received multiple titles. He also coached the Jordanian National 3x3 Team at the World Cup in Mongolia. Recently, he was an assistant coach to U16 National Boys Team and travelled to Serbia, Hungary, and Turkey, participating in various international camps. He has further physical education experience, having completed coaching courses with one of the top seven sports academies in the United States, the DME academy. Another accomplishment includes completing a Canadian Olympic Committee licensed course for sports at the first division and second division levels. Coach Samer has additionally held several camps, with International Organizations including Athlete+, and events that provide youth with exposure to develop and enhance their athletic skills at the national and international level. His most recent accomplishment is founding Infinity Sports Academy, with the purpose of further expanding youth athletics. Coach Samer Nino\'s dedication, elite experience, and commitment to developing young athletes places him as a driving force in shaping the next generation of athletes.',
    imageUrl: '/samer.png'
  },
  {
    id: '2',
    sport: 'Basketball',
    name: 'Coach Naef Asfour',
    description: 'Assistant Coach for AU Men\'s 2 years. Assistant Coach for the Jordan NT Men\'s. Head Coach For the Women\'s Jordan NT. 3 arab Championship 2023/ 2024 / 2025.',
    imageUrl: '/naef-asfour.jpeg'
  },
  {
    id: '3',
    sport: 'Gymnastics',
    name: 'Coach Raya Abu Jamous',
    description: 'My name is Raya Abu Jamous, and I am a current member of the national parkour team, having previously competed as a national team gymnast. I bring over seven years of professional experience as a gymnastics coach, in addition to my work as a fitness and strength coach. Through these roles, I have developed a strong foundation in athletic training, technique development, and performance enhancement, supported by years of dedication to both my athletic career and coaching practice.',
    quote: 'I have developed a strong foundation in gymnastics training to excel youth to the next level.',
    imageUrl: '/raya-abu-jamous.jpeg'
  },
  {
    id: '4',
    sport: 'Gymnastics',
    name: 'Assistant Gymnastics Coach � Ahmad Aldarawish',
    description: 'Dedicated to creating strong athletes through strength and conditioning while aligning them with the core gymnastics program.',
    imageUrl: '/ahmad-aldarawesh.jpg'
  },
  {
    id: '5',
    sport: 'Gymnastics',
    name: 'Assistant Gymnastics Coach � Ammar Salman',
    description: 'An athlete who maintains an active lifestyle through squash, badminton, swimming, and strength training. Over the years, he has built strong athletic ability supported by discipline, consistency, and a genuine passion for sports. His diverse training background has developed solid endurance, strength, and an understanding of effective performance techniques. He is committed to continuous self-improvement and maintaining a healthy, balanced lifestyle.',
    imageUrl: '/ammar-salman.jpg'
  },
  {
    id: '6',
    sport: 'Volleyball',
    name: 'Coach Abdulwahab Abu Khanfar',
    description: 'Coach Abdulwahab aims to share his extensive experience and passion for developing new volleyball talent, drawing on his previous background as a former member of the Jordanian National team. He began his athletic career at Shabab Al-Hussein Club and continued with various clubs, actively competing in the Premier and First Divisions and contributing to team achievements. He founded Spikers Academy in 2018 with the objective of developing fundamental and advanced skills across all age groups. He has organized and managed training programs to enhance player performances. Coach Abdulwahab specializes in volleyball training courses and demonstrates strong leadership and effective communication skills. He is highly committed to player development and consistently applies strategic planning in training programs.',
    achievements: [
      'Former member of the Jordanian National Volleyball Team',
      'Founded Spikers Academy in 2018',
      'Competed in Premier and First Divisions with various clubs'
    ],
    quote: 'Coach Abdulwahab exemplifies excellence in volleyball coaching through experience, vision, and leadership.',
    imageUrl: '/wahab-abu-khanfar.jpeg'
  },
  {
    id: '7',
    sport: 'Volleyball',
    name: 'Coach Leen Al Qassem',
    description: 'Coach Leen Al Qassem has previously been a team player on the Jordanian National Volleyball team, supported by a degree in Physical Education and three years of experience coaching at Spikers Academy, along with coaching at Al-Choueifat School and various summer camps. She has completed several physical education courses, including a volleyball refereeing course and an international volleyball coaches\' program.',
    achievements: [
      'Former team player on the Jordanian National Volleyball Team',
      'Degree in Physical Education',
      'FIVB Certified - Certificate in volleyball coaching and refereeing from the International Volleyball Federation',
      'Three years of coaching experience at Spikers Academy'
    ],
    imageUrl: '/leen.jpeg'
  },
  {
    id: '8',
    sport: 'Volleyball',
    name: 'Coach Rahaf Haimour',
    description: 'Coach Rahaf Haimour is highly experienced as a team leader with strong communication skills. She is a former player on the Jordanian National Volleyball Team and has experience in professional training, coaching, and youth mentorship in sports. Coach Rahaf has a broad skill set, which she utilizes off and on the court, to support athlete development and foster team growth.',
    achievements: [
      'Former player on the Jordanian National Volleyball Team',
      'Experience in professional training and youth mentorship'
    ],
    imageUrl: '/rahaf-haimour.jpeg'
  },
  {
    id: '9',
    sport: 'Volleyball',
    name: 'Coach Raghad Haimour',
    description: 'Coach Raghad Haimour has extensive experience in volleyball. She is a volleyball coach for Abd Alhammed Sharaf International School, where she prepares athletes for professional competitions and tournaments. She is a professional volleyball player with the Al-Nassr club and is also part of the Jordanian National Team. Overall, Coach Raghad demonstrates passion and ambition through her dedication and skill, achieving strong connections with both coaches and players.',
    achievements: [
      'Volleyball coach at Abd Alhammed Sharaf International School',
      'Professional volleyball player with Al-Nassr club',
      'Member of the Jordanian National Volleyball Team'
    ],
    imageUrl: '/raghad-haimour.jpeg'
  },
  {
    id: '11',
    sport: 'Volleyball',
    name: 'Coach Abdullah Yahya',
    description: 'Coach Abdullah Yahya brings valuable experience and dedication to our volleyball program.',
    imageUrl: '/abdallah-yahya.jpeg'
  },
  {
    id: '10',
    sport: 'Volleyball',
    name: 'Coach Ayham',
    description: 'Player for Shabab Al-Hussein Club and the Jordanian Men\'s National Team, and a coach at Spikers Academy for youth age groups. Holds an official coaching certificate from the International Volleyball Federation (FIVB).',
    achievements: [
      'Player for Shabab Al-Hussein Club',
      'Player for the Jordanian Men\'s National Team',
      'Coach at Spikers Academy for youth age groups',
      'FIVB Official Coaching Certificate'
    ],
    imageUrl: '/ayham.jpeg'
  }
];

export function CoachesSection() {
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
  
  // Get unique sports from coaches data (memoized)
  const sports = useMemo(() => ['All', ...Array.from(new Set(COACHES_DATA.map(coach => coach.sport)))], []);
  
  // Filter coaches based on selected sport (memoized)
  const filteredCoaches = useMemo(() => {
    return selectedSport === 'All' 
      ? COACHES_DATA 
      : COACHES_DATA.filter(coach => coach.sport === selectedSport);
  }, [selectedSport]);

  // Toggle coach expansion (memoized callback)
  const toggleCoach = useCallback((coachId: string) => {
    setExpandedCoach(prev => prev === coachId ? null : coachId);
  }, []);

  // Truncate description to 150 characters
  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <section id="trainer" className="bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollAnimation direction="up">
          <div className="flex flex-col gap-3 sm:gap-4 text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Trainer</p>
            <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">Our Coaching Team</h2>
          </div>
        </ScrollAnimation>
        
        {/* About Subsection */}
        <ScrollAnimation direction="up" delay={50}>
          <div className="max-w-4xl mx-auto mb-16">
            <div className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-12">
              <h3 className="text-2xl font-black text-brand-black mb-4">About Our Coaches</h3>
              <p className="text-base text-gray-600 leading-relaxed sm:text-lg">
                Our coaching team consists of experienced professionals who are passionate about developing young athletes. Each coach brings unique expertise, from FIBA-licensed basketball coaches to national team gymnastics coaches, all dedicated to helping athletes reach their full potential.
              </p>
              <p className="mt-4 text-base text-gray-600 leading-relaxed sm:text-lg">
                We believe in a holistic approach to training, combining technical skills, physical conditioning, and mental preparation to create well-rounded athletes ready to compete at the highest levels.
              </p>
            </div>
          </div>
        </ScrollAnimation>

        {/* Sport Filter Buttons */}
        <ScrollAnimation direction="up" delay={100}>
          <div className="flex flex-wrap justify-center gap-3 mb-8 sm:mb-12">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => {
                  setSelectedSport(sport);
                  setExpandedCoach(null); // Close expanded coach when changing sport
                }}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                  selectedSport === sport
                    ? 'bg-brand-green-primary text-white shadow-lg transform scale-105'
                    : 'bg-white text-brand-black border-2 border-brand-lightBlue/20 hover:border-brand-green-primary/60 hover:shadow-md'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </ScrollAnimation>

        {/* Coaches List - Stacked Vertically */}
        {filteredCoaches.length > 0 ? (
          <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8 lg:mt-16">
            {filteredCoaches.map((coach, index) => {
              const isExpanded = expandedCoach === coach.id;
              const description = isExpanded 
                ? coach.description 
                : truncateDescription(coach.description);
              const showReadMore = coach.description.length > 150;

              return (
                <ScrollAnimation 
                  key={coach.id} 
                  direction="up" 
                  delay={index * 100}
                >
                  <div 
                    className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)] cursor-pointer overflow-hidden"
                    onClick={() => toggleCoach(coach.id)}
                  >
                    <div className={`${isExpanded ? 'flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-8' : 'flex flex-row gap-4 p-4 sm:p-6'}`}>
                      {coach.imageUrl && (
                        <div className={`${isExpanded ? (coach.id === '2' || coach.id === '4' || coach.id === '5' ? 'w-64 flex-shrink-0' : 'w-full sm:w-64 flex-shrink-0') : 'w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0'}`}>
                          <div className={`relative ${isExpanded ? (coach.id === '2' || coach.id === '4' || coach.id === '5' ? 'h-64 w-64 rounded-2xl' : 'h-56 w-full rounded-xl sm:h-64 sm:w-64') : (coach.id === '2' || coach.id === '4' || coach.id === '5' ? 'h-24 w-24 sm:h-32 sm:w-32 rounded-xl' : 'h-24 w-24 sm:h-32 sm:w-32 rounded-lg')} overflow-hidden ${coach.id === '2' || coach.id === '4' || coach.id === '5' ? 'border-4 border-brand-lightBlue/30 shadow-lg bg-white p-1' : ''}`}>
                            <Image
                              src={coach.imageUrl}
                              alt={coach.name}
                              fill
                              priority={index < 3}
                              loading={index < 3 ? "eager" : "lazy"}
                              quality={85}
                              className={coach.id === '2' || coach.id === '4' || coach.id === '5' ? "object-contain rounded-lg" : "object-cover"}
                              style={
                                coach.id === '10' 
                                  ? { objectPosition: 'center 15%' } 
                                  : coach.id === '7' 
                                  ? { objectPosition: 'center 15%' } 
                                  : undefined
                              }
                              sizes={isExpanded ? "(max-width: 640px) 100vw, 256px" : "(max-width: 640px) 96px, 128px"}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-grow flex flex-col min-w-0">
                        <div className="flex-shrink-0">
                          <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">{coach.sport}</p>
                          <h3 className={`mt-2 ${isExpanded ? 'text-2xl' : 'text-lg sm:text-xl'} font-black text-brand-black`}>{coach.name}</h3>
                        </div>
                        <div className={`${isExpanded ? 'mt-4' : 'mt-2'}`}>
                          <div 
                            className={`${isExpanded ? 'text-sm' : 'text-xs sm:text-sm'} text-gray-600 leading-relaxed`}
                            style={!isExpanded ? {
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            } : {}}
                          >
                            {description}
                          </div>
                          {showReadMore && (
                            <button 
                              className="mt-2 text-xs font-semibold text-brand-green-primary hover:text-brand-green-dark transition-colors self-start"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCoach(coach.id);
                              }}
                            >
                              {isExpanded ? 'Read less' : 'Read more'}
                            </button>
                          )}
                          {isExpanded && coach.achievements && coach.achievements.length > 0 && (
                            <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
                              {coach.achievements.map((achievement, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
                                  <span>{achievement}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {isExpanded && coach.quote && (
                            <p className="mt-4 text-xs italic text-gray-500 leading-relaxed">
                              &ldquo;{coach.quote}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              );
            })}
          </div>
        ) : (
          <ScrollAnimation direction="up" delay={200}>
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">No coaches found for this sport.</p>
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}

