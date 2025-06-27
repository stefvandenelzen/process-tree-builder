import { setDefaultAutoSelectFamilyAttemptTimeout } from "net";
import { useEffect, useState } from "react";

interface Item {
    id: string;
    text: string;
    completed: boolean;
}

export const TodoList: React.FC = () => {

    const todoList: Item[] = [
        // { id: "a", text: "Start on UI", completed: false },
        // { id: "b", text: "Start on DFG Layout", completed: false },
        // { id: "c", text: "Start on Process Tree Layout", completed: true },
        // { id: "d", text: "Import .xes file", completed: false },
        // { id: "e", text: "Look into more d3 tutorials", completed: true },
        // { id: "f", text: "Fix Todo List to use localstorage", completed: true },
    ];

    const [todos, setTodos] = useState<Item[]>(todoList);
    const [input, setInput] = useState<string>("");
    const [hideDone, setHideDone] = useState<boolean>(false);
    const [enableDelete, setEnableDelete] = useState<boolean>(false);

    useEffect(() => {
        // if (localStorage.getItem("localTasks")) {
        //     const storedList: Item[] = JSON.parse(localStorage.getItem("localTasks")!);
        //     setTodos(storedList);
        // } else {

        // }
        getTodos()
    }, [])

    /* Don't use useEffect with todos to POST, will always POST on reloading the page */

    /* BACKEND COMMUNICATON */
    function postTodos(postData: Item[]) {
        fetch("/todo", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify(postData)
        }).then(
            res => res.json()
        ).then(
            // res => console.log(res)
        )
    }

    function getTodos() {
        fetch("/todo").then(
            res => {
                if (res.status === 200) {
                    console.log("Todos received")
                    console.log(todos)
                    res.json().then(res => setTodos(res))
                } else {
                    console.log("Something went wrong with the Todo GET request")
                }
            }
        )
    }

    /* STATE MANAGEMENT */
    async function handleToggle(id: string) {
        const newTodos = todos.map((todo) => {
            if (todo.id === id) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        })
        await postTodos(newTodos);
        setTodos(newTodos);
        // localStorage.setItem("localTasks", JSON.stringify(newTodos));
    }

    async function handleAdd() {
        if (input) {
            const newTodo: Item = { id: new Date().getTime().toString(), text: input, completed: false }
            const newTodos = [...todos, newTodo]
            await postTodos(newTodos)
            setTodos(newTodos);
            // localStorage.setItem("localTasks", JSON.stringify(newTodos));
            setInput("");
        }
    }
    async function handleDelete(todo: Item) {
        // if (todos.length > 1) {
        //     const newTodos = [...todos];
        //     newTodos.pop();
        //     await postTodos(newTodos)
        //     setTodos(newTodos);
        //     // localStorage.setItem("localTasks", JSON.stringify(newTodos));
        // }
        const newTodos = todos.filter((item) => item.id !== todo.id);
        await postTodos(newTodos);
        setTodos(newTodos);
        setEnableDelete(false);
    }

    async function handleClear() {
        await postTodos(todoList)
        setTodos(todoList)
    }

    interface TaskProps {
        todo: Item
    }

    function Task({ todo }: TaskProps) {

        return (<div className="entry" style={{ backgroundColor: todo.completed ? "lightgray" : "white", color: todo.completed ? "white" : "black" }}>

            {(enableDelete) ? (
                <button className="item" onClick={() => handleDelete(todo)}>Remove</button>
            ) : (
                <></>
            )}

            <li
                className="todo"
                key={todo.id}
                onClick={() => handleToggle(todo.id)}
                style={{ textDecoration: todo.completed ? "line-through" : "none" }}
            >
                {todo.text}
            </li></div>);

    }

    return (
        <div className="section">
            <h1> Todo List: </h1>
            <div className="hide">
                <input
                    className="checkbox"
                    type="Checkbox"
                    checked={hideDone}
                    onChange={() => setHideDone(!hideDone)} />
                Hide completed tasks
            </div>
            <ul>
                {todos.map((todo) => {
                    if (!todo.completed || !hideDone) {
                        return <Task todo={todo} />
                    }
                })}
            </ul>
            <input
                className="textfield"
                type="text"
                placeholder="Add todo item"
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)} />
            <button onClick={handleAdd}>Add</button>
            <button onClick={() => setEnableDelete(!enableDelete)}>Delete</button>
            <button onClick={handleClear}>Clear</button>
            {/* <button onClick={getTodos}>GET</button>
            <button onClick={postTodos}>POST</button> */}
        </div >
    )
}

