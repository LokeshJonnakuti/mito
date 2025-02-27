import type { NextPage } from 'next'
import Image from 'next/image'
import Head from 'next/head'
import Footer from '../components/Footer/Footer';
import Header, { MITO_INSTALLATION_DOCS_LINK } from '../components/Header/Header';
import Tweets from '../components/Tweets/Tweets';
import homeStyles from '../styles/Home.module.css'
import pageStyles from '../styles/Page.module.css'
import titleStyles from '../styles/Title.module.css'
import textImageSplitStyles from '../styles/TextImageSplit.module.css'
import CTAButtons from '../components/CTAButtons/CTAButtons';
import GithubButton from '../components/GithubButton/GithubButton';
import DownloadCTACard from '../components/CTACards/DownloadCTACard';
import TextButton from '../components/TextButton/TextButton';
import AIThesis from '../components/AIThesis/AIThesis';
import { useEffect, useState } from 'react';
import { classNames } from '../utils/classNames';
import FAQCard from '../components/FAQCard/FAQCard';
import Link from 'next/link';
import StreamlitAppGallery from '../components/StreamlitAppGallery/StreamlitAppGallery';

const Home: NextPage = () => {

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copied) {
      setTimeout(() => {setCopied(false)}, 3000)
    }
  }, [copied])

  return (
    <>
      <Head>
        <title>Best Python Spreadsheet Automation & Code Generation | Mito </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <Header/>
    
      <div className={pageStyles.container}>

        <main className={pageStyles.main}>
          <section className={pageStyles.background_card + ' ' + titleStyles.title_card}>
              <h1 className={titleStyles.title}>
                Automate your spreadsheets. No computer science degree required.
              </h1>

              <h2 className={titleStyles.description}>
                Analysts at the world&apos;s largest banks  
                save themselves from hours of repetitive work.
              </h2>
              
              <div className={homeStyles.cta_button_and_video_spacer}>
                <CTAButtons variant='download' align='center'/>
              </div>
              
              <iframe
                className='display-desktop-only-inline-block'
                src="https://mito-for-st-demo.streamlit.app/?embed=true"
                height="650"
                style={{width: '80%', border: 'none'}}
              ></iframe>
              <div id='video' className='display-mobile-only'>
               <video className={homeStyles.video} autoPlay loop disablePictureInPicture playsInline webkit-playsinline="true" muted>
                 <source src="/demo.mp4" />
               </video>
             </div>
          </section>

          <section>
            <div className={classNames(pageStyles.subsection, pageStyles.subsection_justify_baseline)}>
              <div className={textImageSplitStyles.functionality_text}>
                <h2>
                  <span className='text-highlight'>Edit a spreadsheet.</span> <br></br>
                  Generate Python.
                </h2>
                <p className='display-mobile-only'> 
                  Every edit you make to the Mito spreadsheet automatically generates Python code.
                  Stop sitting through Python trainings or waiting for IT support. 
                  Take automation into your own hands using the tools you already know.
                </p>
                <p className='display-desktop-only-inline-block'>
                  Every edit you make to the Mito spreadsheet automatically generates Python code.
                </p>
                <p>
                  Stop sitting through Python trainings or waiting for IT support. 
                  Take automation into your own hands using the tools you already know.
                </p>
                <a href="https://docs.trymito.io/how-to/importing-data-to-mito" target="_blank" rel="noreferrer" className={pageStyles.link_with_p_tag_margins}>
                  View all 100+ transformations →
                </a>
              </div>
              <div className={classNames(textImageSplitStyles.functionality_media, textImageSplitStyles.functionality_media_supress_bottom_margin)}>
                <Image src={'/automate.png'} alt='Automate analysis with Mito' width={500} height={250} layout='responsive'/>
              </div>
            </div>
          
            <div className={classNames(pageStyles.subsection, pageStyles.subsection_justify_baseline)}>
              <div className={classNames(textImageSplitStyles.functionality_media, textImageSplitStyles.functionality_media_supress_bottom_margin, 'display-desktop-only-inline-block')}>
                <Image src={'/Mito_AI_Taskpane.png'} alt='Use Mito AI to transform your data' width={500} height={250} layout='responsive'/>
              </div>
                <div className={textImageSplitStyles.functionality_text}>
                <h2>
                  <span className='text-highlight'>Transform</span> your data with AI
                </h2>
                <p>
                  Describe your edits in plain english. The Mito AI assistant will write the code.
                </p>
                <p className={pageStyles.link}>
                  <Link href="/python-ai-tools" >
                    Learn more about Mito AI →
                  </Link>
                </p>
              </div>
              <div className={classNames(textImageSplitStyles.functionality_media, textImageSplitStyles.functionality_media_supress_bottom_margin, 'display-mobile-only-block')}>
                <Image src={'/Mito_AI_Taskpane.png'} alt='Use Mito AI to transform your data' width={500} height={250} layout='responsive'/>
              </div>
            </div>

            <div className={classNames(pageStyles.subsection, pageStyles.subsection_justify_baseline)}>
              <div className={textImageSplitStyles.functionality_text}>
                <h2>
                  All in <span className='text-color-jupyter-orange'>Jupyter</span> and <span className='text-color-streamlit-red'>Streamlit</span>
                </h2>
                <p className='display-mobile-only'> 
                  Mito is a Jupyter extension and Streamlit component, so you don&apos;t need to set up any new infrastructure. 
                  Get started with Mito in seconds. It&apos;s easy as pip install mitosheet.
                </p>
                <p className='display-desktop-only-inline-block'>
                  Mito is a Jupyter extension, so you don&apos;t need to set up any new infrastructure.
                </p>
                <p className='display-desktop-only-inline-block'>
                  Get started with Mito in seconds. It&apos;s easy as: <br></br><br></br>
                  <span className='code-background' onClick={async () => {
                    // Copy to clickboard on click
                    await navigator.clipboard.writeText('pip install mitosheet');
                    setCopied(true);
                  }}>
                    pip install mitosheet
                  </span> {copied && "- copied!"}
                </p>
              </div>
              <div className={classNames(textImageSplitStyles.functionality_media, textImageSplitStyles.functionality_media_supress_bottom_margin)}>
                <Image src={'/jupyter-and-streamlit.png'} alt='Use Mito in Jupyter or Streamlit' width={678} height={342} layout='responsive'/>
              </div>
            </div>

          </section>


          <section>
            <div className={classNames(pageStyles.subsection, pageStyles.subsection_column, 'center')}>
                <h2>
                  Upgrade Python scripts to interactive Streamlit Dashboards
                </h2>
                <p>
                  Turn one hour of automation savings into tens of hours by sharing automation scripts through Streamlit dashboards.
                </p>
                <p className={pageStyles.link}>
                  <Link href="/data-apps" >
                    Learn more about Mito in Streamlit →
                  </Link>
                </p>
            </div>
            <StreamlitAppGallery />
                
          </section>

          <section className={homeStyles.metrics_container + ' margin-top-8rem'}>
            <div className={homeStyles.metric_container}>
              <p className={homeStyles.metric_number_text}>
                50,000+
              </p>
              <p className={homeStyles.metrics_label}>
                Mito users
              </p>
            </div>
            <div className={homeStyles.metric_container}>
              <p className={homeStyles.metric_number_text}>
                10,000+
              </p>
              <p className={homeStyles.metrics_label}>
                Hours saved through automation
              </p>
            </div>
            <div className={homeStyles.metric_container}>
              <p className={homeStyles.metric_number_text}>
                250,000+
              </p>
              <p className={homeStyles.metrics_label}>
                Mito Sheets Created
              </p>
            </div>
          </section>

          <AIThesis/>

          <section className={classNames(pageStyles.background_card, homeStyles.case_study_section, 'margin-top-8rem')}>
            <div>
              <h2 className={homeStyles.case_study_text}>
                Enigma’s Director of Finance saves 16 hours per month with Mito
              </h2>
              <TextButton 
                text="Read Tom's Story"
                href="/blog/enigma-case-study/"
              />
            </div>
            <div className={homeStyles.case_study_headshot}>
              <Image src='/bellis.jpeg' alt='Explore your data with Mito' width={250} height={250} ></Image>
            </div>
          </section>

          <section className={homeStyles.tweet_section}>
            <div className={homeStyles.tweet_section_header + ' center'}>
              <h2>
                Mito is the go-to Python tool at the largest banks in the world
              </h2>
              <h3 className={titleStyles.description + ' display-desktop-only-inline-block'}>
                See why Mito is ranked as one of the top Python libraries of 2023
              </h3>
              <p>
                 <Link href='/customers'><a className={pageStyles.link}>Read how analysts at the largest financial institutions use Mito to save hours per week →</a></Link>
              </p>
            </div>
            <Tweets />
          </section>

          <section className={homeStyles.open_source_section}>
              <div className={homeStyles.open_source_section_header + ' center'}>
                <h2>
                  We&apos;re proud to support important open source projects
                </h2>
              </div>
              <div className={classNames(pageStyles.subsection, homeStyles.open_source_section_logos)}>
                <a className={homeStyles.open_source_section_logo_container} href='https://numfocus.org/donate-to-jupyter' target='_blank' rel="noreferrer">
                  <Image src={'/mito_and_jupyter.png'} alt='Mito supports Jupyter' width={800} height={600}/>
                </a>
              </div>
          </section>

          <section className={pageStyles.background_card}>
            <DownloadCTACard />
          </section>

          <section style={{marginBottom: '60px'}}>
            <h2 className='center'>
              Frequently Asked Questions
            </h2>
            <FAQCard title='Is Mito open source?'>
              <div>
                <p>
                  Mito is an open source project, and the codebase is available on <a className={pageStyles.link} href='https://github.com/mito-ds/monorepo' target="_blank" rel="noreferrer">Github</a>.
                </p>
                <p>
                  Outside contributions are welcome and encouraged! 
                </p>
              </div>
            </FAQCard>
            <FAQCard title='Is Mito free?'>
              <div>
                <p>
                  Mito Open Source is free. You can install Mito by following the install instructions <a className={pageStyles.link} href={MITO_INSTALLATION_DOCS_LINK} target="_blank" rel="noreferrer">here</a>.
                </p>
                <p>
                  For individuals automating spreadsheet processes, we offer a Pro version. Mito Pro includes unlimited AI completions, disabling all telemetry, and additional formatting and transformation options.
                </p>
                <p>
                  For enterprises looking to accelerate Python adoption, Mito Enterprise includes advanced functionality like admin controls, database and LLM integrations, and training programs. 
                </p>
                <p>
                  See more at our <Link href='/plans'><a className={pageStyles.link}>plans page.</a></Link>
                </p>
              </div>
            </FAQCard>
            <FAQCard title='How do I install Mito?'>
              <div>
                <p>
                  Mito is a Jupyter extension that runs in JupyterLab, Jupyter notebooks, and JupyterHub.
                </p>
                <p>
                  You can install Mito by following the install instructions <a className={pageStyles.link} href={MITO_INSTALLATION_DOCS_LINK} target="_blank" rel="noreferrer">here</a>.
                </p>
              </div>
            </FAQCard>
            <FAQCard title='Can I use Mito to automate my spreadsheet tasks?'>
              <div>
                <p>
                  Yes! Mito is designed to help you automate your spreadsheet tasks.
                </p>
                <p>
                  By completing your spreadsheet workflow a single time in Mito, you will get a Python script that you can rerun on new data.
                </p>
              </div>
            </FAQCard>
            <FAQCard title='Can I use Python to view a spreadsheet?'>
              <div>
                <p>
                  Mito provides a spreadsheet interface within your Python enviornment. 
                </p>
                <p>
                  You can use Mito to view, edit, and transform your spreadsheet data from within Python, without needing to be a Python expert.
                </p>
              </div>
            </FAQCard>
            
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Home
