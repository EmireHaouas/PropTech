import { useState } from 'react'
import './App.css'

function App() {
    const [houses, setHouses] = useState([]);
    const apiScratch= 'http://localhost:3001/api/scrape'
    const [loading, setLoading] = useState(false);
    const searchHouses = async () => {
        setLoading(true);
        try{
            const response = await fetch(apiScratch);
            if (!response.ok) throw new Error('Server error');
            const data = await response.json();
            if (data.success) {
                setHouses(data.houses);
            }
        } catch (error) {
            console.error('Scanning error:', error.message);
        }finally {
            setLoading(false);
        }
    };

  return (
    <>
<h1>Recherche de Maison</h1>
        <button onClick={searchHouses}>Rechercher</button>
    </>
  )
}

export default App
