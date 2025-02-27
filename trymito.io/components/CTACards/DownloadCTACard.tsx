import titleStyles from '../../styles/Title.module.css';
import CTAButtons from '../CTAButtons/CTAButtons';

const DownloadCTACard = (): JSX.Element => {

    return (
        <div> 
            <h2 className={titleStyles.title}>
                Want to install Mito locally?
            </h2>
            <div className='center'>
                <CTAButtons variant='download' align='center'/>
            </div>  
        </div>
    )
}

export default DownloadCTACard; 