import { Cartographer } from './modules/cartographer'
import loadJson from './modules/load-json/'

const app = {

	init: () => {

		const key = app.getURLParams('key')

		if ( key != null ) {

			app.loader(key)

		} else {

			// This is for testing only
			app.loader("1iS3dnYn2JteXpa2EMhIfSWtzy3NG0S1KtDwekGlWC20")
			
		}

	},

	loader: (key) => {

		loadJson('https://interactive.guim.co.uk/docsdata/' + key + '.json')
      		.then((data) => {
				new Cartographer(data.sheets);
		    })

	},

	getURLParams: (paramName) => {

		const params = window.location.search.substring(1).split("&")

	    for (let i = 0; i < params.length; i++) {
	    	let val = params[i].split("=");
		    if (val[0] == paramName) {
		        return val[1];
		    }
		}
		return null;

	}

}

app.init()




