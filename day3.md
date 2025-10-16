Awesome, now we know how to make back to front message. now let's make front to back and front again!


first few things updatedd,

notice the routes are now 
app.use('/api', homeRoutes);
app.use('/api/login', loginRoutes);
instead of 
app.use('/api', loginRoutes);
the key is to avoid repetition. even better later we can make api central but fro nnow our current route is okay.

also you can run the entire proejct though root just by nom run dev, it will launch both front and back

okay now right to business!
we gonna give data to back, and get it from frontback


now go to /project
you should see button 
{id} and {view} ( chat, kanboard , submission)


now when it click, i will give you to http://localhost:5173/project/{id} /{view}

if you click on chat 
http://localhost:5173/project/1/chat
not ice how is differnt to 
http://localhost:5173/project/2/chat

that is waht we want. liek even smae route, it is differnt because of our paramter.1

so tht is what we going to do today :

first create chat like we create other roues but we will had parameters 
    const { id } = useParams();
    const [message, setMessage] = useState("...");

so that when we fetch from bakend 
  useEffect(() => {
        axios.get(`http://localhost:3002/api/project/${id}/chat`)
            .then(response => {
                setMessage(response.data.message);
            });
    }, [id]);

    we used that id that we will pass to our back


    